import {
    ReceiveMessageCommand,
    SQSClient,
    DeleteMessageCommand,
  } from "@aws-sdk/client-sqs";
  import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
  
  import dotenv from "dotenv";
  
  dotenv.config();
  
  const client = new SQSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  const ecsClient = new ECSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  async function init() {
    const command = new ReceiveMessageCommand({
      QueueUrl: process.env.AWS_SQS_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    });
  
    while (1) {
      try {
        const { Messages } = await client.send(command);
        if (!Messages) {
          console.log("No messages");
          continue;
        }
        //   if (Messages?.Messages) {
        //     console.log(response.Messages[0].Body);
        //   }
  
        for (const message of Messages) {
          const { MessageId, Body } = message;
          if (!Body) {
            continue;
          }
     
  
          const event = JSON.parse(Body);
  
          if ("Service" in event && "Event" in event) {
            if (event.Event === "s3:TestEvent") {
              await client.send(
                new DeleteMessageCommand({
                  QueueUrl: process.env.AWS_SQS_URL,
                  ReceiptHandle: message.ReceiptHandle,
                })
              );
  
              continue;
            }
          }
  
          for (const record of event.Records) {
            const { s3 } = record;
            const { bucket, object } = s3;
            const runTaskCommand = new RunTaskCommand({
              taskDefinition:
                process.env.AWS_TASK_DEFINITION,
              cluster:
                AWS_CLUSTER_NAME,
              launchType: "FARGATE",
              networkConfiguration: {
                awsvpcConfiguration: {
                  subnets: [
                    "subnet-05fc7489d29322f83",
                   
                  ],
                  securityGroups: ["sg-084bd8181a2fdaf0e"],
                  assignPublicIp: "ENABLED",
                },
              },
              overrides: {
                containerOverrides: [
                  {
                    name: "video-transcoder",
                    environment: [
                      {
                        name: "BUCKET_NAME",
                        value: bucket.name,
                      },
                      {
                        name: "KEY",
                        value: object.key,
                      },
                    ],
                  },
                ],
              },
            });
  
            await ecsClient.send(runTaskCommand);
  
            console.log(`Bucket: ${bucket.name}`);
            console.log(`Object: ${object.key}`);
          }
  
          // Validate the event
          // Spin the Docker container
          // Delete from Queue
  
          await client.send(
            new DeleteMessageCommand({
              QueueUrl: process.env.AWS_SQS_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  
  init();
  