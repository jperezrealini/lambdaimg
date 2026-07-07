import { ALLOWED_IMAGE_WIDTHS } from "@lambdaimg/core";
import * as AWS from "alchemy/AWS";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import { imagesBucket } from "./images-bucket.js";
import ImagesResize from "./resize-function.js";

const CLOUDFRONT_ORIGIN_DEFAULTS = {
  originPath: "",
  customHeaders: {} as Record<string, string>,
  originShield: { enabled: false },
  connectionAttempts: 3,
  connectionTimeout: 10,
};

// CloudFront update calls require fully materialized origin/behavior blocks.
// These values mirror CloudFront defaults so Alchemy updates remain stable.
const CLOUDFRONT_BEHAVIOR_DEFAULTS = {
  smoothStreaming: false,
  fieldLevelEncryptionId: "",
  trustedSigners: [] as string[],
  trustedKeyGroups: [] as string[],
  functionAssociations: [] as { functionArn: string; eventType: string }[],
  lambdaFunctionAssociations: [] as {
    lambdaFunctionArn: string;
    eventType: string;
    includeBody?: boolean;
  }[],
};

export type ImagesStackProps =
  | {
      /** Public hostname for the image CDN (e.g. images.example.com). Requires hostedZoneId. */
      domain: string;
      /** Existing Route53 zone containing (or that will contain) `domain`. */
      hostedZoneId: string;
    }
  | { domain?: undefined; hostedZoneId?: undefined };

export const ImagesStack = (id: string, props: ImagesStackProps = {}) =>
  Effect.gen(function* () {
    const bucket = yield* imagesBucket;
    const { accountId } = yield* AWS.AWSEnvironment.current;
    const s3Oac = yield* AWS.CloudFront.OriginAccessControl(`${id}S3Oac`, {
      originType: "s3",
      description: "Images bucket origin access control",
    });
    const lambdaOac = yield* AWS.CloudFront.OriginAccessControl(`${id}LambdaOac`, {
      originType: "lambda",
      description: "Images resize Lambda function URL origin access control",
    });
    const resize = yield* ImagesResize;

    const customDomain = props.domain !== undefined;

    const certificate = customDomain
      ? yield* AWS.ACM.Certificate(`${id}Cert`, {
          domainName: props.domain,
          hostedZoneId: props.hostedZoneId,
        })
      : undefined;

    const longTtlCachePolicy = yield* AWS.CloudFront.CachePolicy(`${id}LongTtlCache`, {
      minTTL: 31536000,
      defaultTTL: 31536000,
      maxTTL: 31536000,
      parametersInCacheKeyAndForwardedToOrigin: {
        CookiesConfig: { CookieBehavior: "none" },
        HeadersConfig: { HeaderBehavior: "none" },
        QueryStringsConfig: { QueryStringBehavior: "none" },
        EnableAcceptEncodingGzip: true,
        EnableAcceptEncodingBrotli: true,
      },
    });

    const lambdaOriginDomain = Output.map(resize.functionUrl, (functionUrl) => {
      if (!functionUrl) {
        throw new Error("ImagesResize function URL is required");
      }
      return new URL(functionUrl).hostname;
    });

    const distribution = yield* AWS.CloudFront.Distribution(`${id}Cdn`, {
      aliases: customDomain ? [props.domain] : [],
      priceClass: "PriceClass_All",
      httpVersion: "http2and3",
      logging: { enabled: false },
      defaultRootObject: "",
      webAclId: "",
      originGroups: [
        {
          id: "resized",
          members: ["s3", "lambda"],
          failoverStatusCodes: [403, 404],
        },
      ],
      staging: false,
      origins: [
        {
          ...CLOUDFRONT_ORIGIN_DEFAULTS,
          id: "s3",
          domainName: bucket.bucketRegionalDomainName,
          s3Origin: true,
          originAccessControlId: s3Oac.originAccessControlId,
        },
        {
          ...CLOUDFRONT_ORIGIN_DEFAULTS,
          id: "lambda",
          domainName: lambdaOriginDomain,
          originAccessControlId: lambdaOac.originAccessControlId,
          customOriginConfig: {
            originProtocolPolicy: "https-only",
            originReadTimeout: 30,
            originKeepaliveTimeout: 5,
          },
        },
      ],
      defaultCacheBehavior: {
        ...CLOUDFRONT_BEHAVIOR_DEFAULTS,
        targetOriginId: "s3",
        viewerProtocolPolicy: "redirect-to-https",
        compress: true,
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        cachePolicyId: longTtlCachePolicy.cachePolicyId,
      },
      orderedCacheBehaviors: ALLOWED_IMAGE_WIDTHS.map((width) => ({
        ...CLOUDFRONT_BEHAVIOR_DEFAULTS,
        pathPattern: `/_/w${width}/*`,
        targetOriginId: "resized",
        viewerProtocolPolicy: "redirect-to-https" as const,
        compress: true,
        allowedMethods: ["GET", "HEAD"] as const,
        cachedMethods: ["GET", "HEAD"] as const,
        cachePolicyId: longTtlCachePolicy.cachePolicyId,
      })),
      customErrorResponses: [],
      ...(customDomain && certificate
        ? {
            viewerCertificate: {
              acmCertificateArn: certificate.certificateArn,
              sslSupportMethod: "sni-only" as const,
              minimumProtocolVersion: "TLSv1.2_2021" as const,
            },
          }
        : {
            viewerCertificate: {
              cloudFrontDefaultCertificate: true,
              minimumProtocolVersion: "TLSv1.2_2021" as const,
            },
          }),
    });

    yield* AWS.Lambda.Permission(`${id}ResizeCloudFront`, {
      action: "lambda:InvokeFunctionUrl",
      functionName: resize.functionArn,
      principal: "cloudfront.amazonaws.com",
      sourceArn: distribution.distributionArn,
      functionUrlAuthType: "AWS_IAM",
    });
    yield* AWS.Lambda.Permission(`${id}ResizeCloudFrontInvokeFunction`, {
      action: "lambda:InvokeFunction",
      functionName: resize.functionArn,
      principal: "cloudfront.amazonaws.com",
      sourceArn: distribution.distributionArn,
      invokedViaFunctionUrl: true,
    });

    // Avoid a Bucket -> Distribution -> Lambda -> Bucket dependency cycle by
    // scoping OAC access to CloudFront distributions in the same AWS account.
    yield* bucket.bind`AWS.S3.Policy(${bucket})`({
      policyStatements: [
        {
          Effect: "Allow",
          Principal: {
            Service: "cloudfront.amazonaws.com",
          },
          Action: ["s3:GetObject"],
          Resource: [Output.interpolate`${bucket.bucketArn}/*`],
          Condition: {
            ArnLike: {
              "AWS:SourceArn": `arn:aws:cloudfront::${accountId}:distribution/*`,
            },
          },
        },
      ],
    });

    if (customDomain) {
      yield* AWS.Route53.Record(`${id}Alias`, {
        hostedZoneId: props.hostedZoneId,
        name: props.domain,
        type: "A",
        aliasTarget: {
          hostedZoneId: distribution.hostedZoneId,
          dnsName: distribution.domainName,
        },
      });
    }

    return {
      domain: customDomain ? props.domain : distribution.domainName,
      url: customDomain
        ? Output.interpolate`https://${props.domain}`
        : Output.map(
            distribution.domainName,
            (distributionDomain) => `https://${distributionDomain}`,
          ),
      distributionDomain: distribution.domainName,
      resizeFunctionUrl: resize.functionUrl,
      bucketName: bucket.bucketName,
    };
  });
