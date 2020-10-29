const config = {
    sshOpt : {
        host: '',
        username: '',
        password: ''
    },
    remoteZipFilePath : '',
    zipFilePassword : '',
    azureBlobConnectionString : 'DefaultEndpointsProtocol=https;AccountName=;AccountKey=;EndpointSuffix=core.windows.net',
    azureBlobcontainerName: 'blob2',
    azureBlobName:'finalFile.txt',
    localdir : 'temp',
    localZipFileName : 'sample.zip',
    logDirectory : 'Log',
    logName:'ErrorLogs.log'
};

module.exports = config;