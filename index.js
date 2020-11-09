const fs = require('fs');
const https = require('https');
const config = require('./config');
const unzipper = require('unzipper');
const Client = require('ssh2').Client;
const dirPath = __dirname + '/';
const logPath = dirPath + config.logDirectory + '/' + config.logName;

try {
    let isNewFile = false; //download and upload if it's a new file.
    const conn = new Client();
    const sshOpt = config.sshOpt;
    const localdir = dirPath + config.localdir;
    const remoteFile = config.remoteZipFilePath;
    const localZipFileName = config.localZipFileName;
    const localFile = localdir + '/' + localZipFileName;
    const localZipPassword = config.zipFilePassword;
    const lastModifiedTimeFile = dirPath + '/' + config.lastModifiedRemoteZipFilePicked;
    if (!fs.existsSync(dirPath + config.logDirectory)) {
        //create the Folders if not exists
        fs.mkdirSync(dirPath + config.logDirectory);
    }
    if (!fs.existsSync(localdir)) {
        //create the Folders if not exists
        fs.mkdirSync(localdir);
    }
    else if (fs.existsSync(localFile)) {
        //delete the zip file if exists
        fs.unlinkSync(localFile);
    }
    if(!fs.existsSync(lastModifiedTimeFile)){
        fs.writeFileSync(lastModifiedTimeFile,"0");
    }
    //connect to SFTP server via ssh
    conn.on('ready', () => {
        conn.sftp((err, sftp) => {
            if (err) {
                fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
                throw err;
            }
            sftp.stat(remoteFile, (err, stats) => {
                if (err) {
                    fs.appendFileSync(logPath, Date() + JSON.stringify(err) + "\n");
                    throw err;
                }
                console.log(stats);
                let lastModifiedTime = parseInt(fs.readFileSync(lastModifiedTimeFile,'utf8'));
                if(lastModifiedTime < stats.mtime){
                    isNewFile = true;
                }
                if (isNewFile) {
                    //download the zip file to local machine
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
                                //unzip the f out of zip
                                const directory = await unzipper.Open.file(localFile);
                                const extractedbuffer = await directory.files[0].buffer(localZipPassword);
                                console.log('file extracted');
                                const sasURL = config.azureBlobRootURL + config.azureBlobPath + '/' + config.azureBlobName + config.azureBlobSasToken;
                                console.log('sas url ' + sasURL);
                                const data = extractedbuffer.toString();
                                if (fs.existsSync(localFile)) {
                                    fs.unlinkSync(localFile);
                                }
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
                                    fs.appendFileSync(logPath, Date() + `{"statusCode": ${res.statusCode}}\n`);
                                    if(res.statusCode == 201){
                                        fs.writeFileSync(lastModifiedTimeFile, stats.mtime.toString());
                                    }
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
                }
                else {
                    conn.end();
                    console.log('File is not modified');
                    fs.appendFileSync(logPath, Date() + ' File was already updated\n');
                }
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
