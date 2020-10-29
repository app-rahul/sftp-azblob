const fs = require('fs');
const config = require('./config');
const unzipper = require('unzipper');
const Client = require('ssh2').Client;

try {
    const conn = new Client();
    const sshOpt = config.sshOpt;
    const remoteFile = config.remoteZipFilePath;
    const localdir = config.localdir;
    const localZipFileName = config.localZipFileName;
    const localFile = localdir + '/' + localZipFileName;
    const localZipPassword = config.zipFilePassword;
    const logPath = config.logDirectory + '/' + config.logName;
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
                        //var wstream = fs.createWriteStream('out1.txt');
                        const directory = await unzipper.Open.file(localFile);
                        const extractedstram = await directory.files[0].buffer(localZipPassword);
                        console.log(extractedstram.toString());
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
