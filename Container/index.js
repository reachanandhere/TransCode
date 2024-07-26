const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
  } = require("@aws-sdk/client-s3");
  const fs = require("node:fs/promises");
  const fsOld = require("node:fs");
  const path = require("node:path");
  const ffmpeg = require("fluent-ffmpeg");
  require("dotenv").config();
  
  const RESOLUTIONS = [
    {
      name: "360p",
      width: 480,
      height: 360,
    },
    {
      name: "480p",
      width: 858,
      height: 480,
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
    },
  ];
  
  const s3Client = new S3Client({
    region: "",
    credentials: {
      accessKeyId: "",
      secretAccessKey: "",
    },
  });
  
  const BUCKET_NAME = process.env.BUCKET_NAME;
  const KEY = process.env.KEY;
  async function init() {
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: KEY,
    });
    console.log("below printed");
    try {
      const response = await s3Client.send(command);
  
      const originalFilePath = `original-video.mp4`;
      await fs.writeFile(originalFilePath, response.Body);
      const originalVideoPath = path.resolve(originalFilePath);
  
      const promises = RESOLUTIONS.map(async (resolution) => {
        const { name, width, height } = resolution;
        const outputFilePath = `${name}-video.mp4`;
  
        return new Promise(async (resolve, reject) => {
          ffmpeg(originalVideoPath)
            .output(outputFilePath)
            .withVideoCodec("libx264")
            .withAudioCodec("aac")
            .withSize(`${resolution.width}x${resolution.height}`)
            .on("start", () => {
              console.log(`Processing video at ${resolution.width}x${resolution.height}`);
            })
            .on("end", async () => {
              const putCommand = new PutObjectCommand({
                Bucket: "reachanand.production-videos",
                Key: outputFilePath,
                Body: await fsOld.createReadStream(path.resolve(outputFilePath)),
              });
              await s3Client.send(putCommand);
              resolve();
            })
            .format("mp4")
            .run();
        });
      });
  
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
    }
  }
  
  init();
  