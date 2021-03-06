import {
	Detector,
	Resource,
	ResourceDetectionConfig,
} from '@opentelemetry/resources';
import { awsEc2Detector as otelAWSEc2Detector } from '@opentelemetry/resource-detector-aws';
import { cLogger } from '../../utils/logger';

class AwsEc2Detector implements Detector {
	async detect(_config?: ResourceDetectionConfig): Promise<Resource> {
		try {
			let awsResource = await otelAWSEc2Detector.detect();
			const arn = `aws:ec2:${awsResource.attributes['cloud.region']}:${awsResource.attributes['cloud.account.id']}:instance/${awsResource.attributes['host.id']}`;
			const updatedResource = new Resource({
				'aws.arn': arn,
			});
			awsResource = awsResource.merge(updatedResource);
			return awsResource;
		} catch (e) {
			// TODO: implement PrivateIP detection
			cLogger.error('Error: ', e);
			return Resource.empty();
		}
	}
}

export const awsEc2Detector = new AwsEc2Detector();
