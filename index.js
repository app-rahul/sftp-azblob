const fs = require('fs');
const config = require('./config');
const unzipper = require('unzipper');
const Client = require('ssh2').Client;
const { BlobServiceClient } = require('@azure/storage-blob');

const logPath = config.logDirectory + '/' + config.logName;
    
try {
    const conn = new Client();
    const sshOpt = config.sshOpt;
    const remoteFile = config.remoteZipFilePath;
    const localdir = config.localdir;
    const localZipFileName = config.localZipFileName;
    const localFile = localdir + '/' + localZipFileName;
    const localZipPassword = config.zipFilePassword;
    if (!fs.existsSync(config.logDirectory)) {
        fs.mkdirSync(config.logDirectory);
    }
    if (!fs.existsSync(localdir)) {
        fs.mkdirSync(localdir);
    }
    else if (fs.existsSync(localFile)) {
        fs.unlinkSync(localFile);
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.azureBlobConnectionString);
    const containerClient = blobServiceClient.getContainerClient(config.azureBlobcontainerName);
    conn.on('ready', () => {
        conn.sftp((err, sftp) => {
            if (err) {
                fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
                throw err;
            }
            console.log('Downloading ' + remoteFile);
            sftp.fastGet(remoteFile, localFile, (err) => {
                if (err) {
                    fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
                    throw err;
                }
                console.log('Downloaded to ' + localFile);
                conn.end();
                (async () => {
                    try {
                        const directory = await unzipper.Open.file(localFile);
                        const extractedstram = directory.files[0].stream(localZipPassword);
                        // Get a block blob client
                        const blockBlobClient = containerClient.getBlockBlobClient(config.azureBlobName);

                        console.log('Uploading to Azure storage as blob:\n\t', config.azureBlobName);

                        // Upload data to the blob
                        const uploadBlobResponse = await blockBlobClient.uploadStream(extractedstram);
                        console.log("Blob was uploaded successfully. requestId: ", uploadBlobResponse.requestId);
                    }
                    catch (err) {
                        fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
                        throw err;
                    }
                })();
            });
        });
    });
    conn.on('error', (err) => {
        fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
        throw err;
    });
    conn.connect(sshOpt);
}
catch (err) {
    fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
    throw err;
}
