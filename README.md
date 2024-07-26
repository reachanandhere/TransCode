# Transcode

-- Transcode is a Video Transcoding platform that transcodes videos into different formats.
-- It uses Amazon S2, Amazon SQS, Amazon ECS, Amazon ECR, Docker and ffmpeg to convert files into requested formats.

# How does Transcode works
1. There are 2 S3 Buckets. The raw file is first uploaded to one S3 Bucket.
2. As soon as the file is put into S3 bucket, it pushes an event in SQS.
3. The Node Server keeps polling the SQS.
4. Once it finds an event, it spins up the docker container.
5. The docker container first pulls the video from the S3 bucket and then ffmpeg converts the video into different formats.
6. At the same time, it keeps pushing the new formatted videos to new S3 bucket.
7. Once the Transcoding is done, the video is deleted from the Queue.