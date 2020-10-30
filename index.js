const fs = require('fs');
const https = require('https');
const config = require('./config');
const unzipper = require('unzipper');
const Client = require('ssh2').Client;
const logPath = config.logDirectory + '/' + config.logName;

try {
    const conn = new Client();
    const sshOpt = config.sshOpt;
    const localdir = config.localdir;
    const remoteFile = config.remoteZipFilePath;
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
                        const extractedbuffer = await directory.files[0].buffer(localZipPassword);
                        console.log('file extracted');
                        const sasURL = config.azureBlobRootURL + config.azureBlobPath + '/' + config.azureBlobName + config.azureBlobSasToken;
                        console.log('sas url ' + sasURL);
                        const data = extractedbuffer.toString();
                        const options = {
                            method: 'PUT',
                            headers: {
                                'Content-Length': data.length,
                                'x-ms-blob-type': 'BlockBlob'
                            }
                        }
                        const req = https.request(sasURL, options, (res) => {
                            console.log(`statusCode: ${res.statusCode}`)
                            res.on('data', (d) => { console.log(d.toString()); })
                        })
                        req.on('error', (err) => {
                            fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
                            throw err;
                        })
                        req.write(data)
                        req.end()
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