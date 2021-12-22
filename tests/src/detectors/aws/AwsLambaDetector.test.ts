import { mocked } from "ts-jest/utils";
import { awsLambdaDetector, awsLambdaDetectorWithContext } from "../../../../src/detectors/aws/AwsLambdaDetector";
import { awsLambdaDetector as otelAWSLambdaDetector } from '@opentelemetry/resource-detector-aws';
import { LambdaClient } from '@aws-sdk/client-lambda';

const { Resource } = require("@opentelemetry/resources")
const { SemanticResourceAttributes, CloudPlatformValues } =require( "@opentelemetry/semantic-conventions");

jest.mock('@opentelemetry/resource-detector-aws')
jest.mock('@aws-sdk/client-lambda')

beforeEach(() => {
    mocked(otelAWSLambdaDetector.detect).mockClear()
    mocked(LambdaClient).mockClear()
    mocked(LambdaClient.prototype.send).mockClear()
})

describe('AwsLambdaDetector', () => {

    it('should be defined', () => {
        expect(awsLambdaDetector).toBeDefined();
    })

    it('should return empty resource if Lambda not detected', async () => {
       
        mocked(otelAWSLambdaDetector.detect).mockReturnValue(Promise.resolve(Resource.empty()))
        const resource = await awsLambdaDetector.detect()
        expect(resource).toBe(Resource.empty())

        mocked(otelAWSLambdaDetector.detect).mockClear()

        mocked(otelAWSLambdaDetector.detect).mockReturnValue(Promise.reject({}))
        const resource1 = await awsLambdaDetector.detect()
        expect(resource1).toBe(Resource.empty())
    })

    it('should check for context and retrieve invokedFunctionArn', async () => {
        const context = {
            invokedFunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function:$LATEST'
        }
        mocked(otelAWSLambdaDetector.detect).mockImplementation((): Promise<any> => {
            return Promise.resolve(new Resource({
                [SemanticResourceAttributes.CLOUD_REGION]: 'us-west-2',
                [SemanticResourceAttributes.CLOUD_PROVIDER]: 'AWS',
                [SemanticResourceAttributes.FAAS_NAME]: 'my-function',
                [SemanticResourceAttributes.FAAS_VERSION]: '$LATEST'

            }))
        })
        
        let detector = new awsLambdaDetectorWithContext(context)

        const resource = await detector.detect()
        expect(resource.attributes['faas.id']).toBe('arn:aws:lambda:us-west-2:123456789012:function:my-function:$LATEST')
        expect(resource.attributes[SemanticResourceAttributes.CLOUD_PLATFORM]).toBe(CloudPlatformValues.AWS_LAMBDA)
    })
    
    it('should make api call if context not present', async () => {

        mocked(otelAWSLambdaDetector.detect).mockImplementation((): Promise<any> => {
            return Promise.resolve(new Resource({
                [SemanticResourceAttributes.CLOUD_REGION]: 'us-west-2',
                [SemanticResourceAttributes.CLOUD_PROVIDER]: 'AWS',
                [SemanticResourceAttributes.FAAS_NAME]: 'my-function',
                [SemanticResourceAttributes.FAAS_VERSION]: '$LATEST'

            }))
        })

        mocked(LambdaClient.prototype.send).mockReturnValue(Promise.resolve({
            Configuration: {
                FunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function:$LATEST'
            }
        }) as any)

        const resource = await awsLambdaDetector.detect()
        expect(resource.attributes['faas.id']).toBe('arn:aws:lambda:us-west-2:123456789012:function:my-function:$LATEST')
        expect(resource.attributes[SemanticResourceAttributes.CLOUD_PLATFORM]).toBe(CloudPlatformValues.AWS_LAMBDA)

    })

    it('should return empty resource if api call fails', async () => {

        mocked(otelAWSLambdaDetector.detect).mockImplementation((): Promise<any> => {
            return Promise.resolve(new Resource({
                [SemanticResourceAttributes.CLOUD_REGION]: 'us-west-2',
                [SemanticResourceAttributes.CLOUD_PROVIDER]: 'AWS',
                [SemanticResourceAttributes.FAAS_NAME]: 'my-function',
                [SemanticResourceAttributes.FAAS_VERSION]: '$LATEST'

            }))
        })

        mocked(LambdaClient.prototype.send).mockReturnValue(Promise.reject({}) as any)

        const resource = await awsLambdaDetector.detect()
        expect(resource).toBe(Resource.empty())
    })

})