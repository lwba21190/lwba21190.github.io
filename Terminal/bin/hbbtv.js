var program = require("commander");
var package = require("../package.json");
program.version(package.version)
    .allowUnknownOption(false)
    .option("-m, --mode <mode>", "select mode. It is either 'terminal' to start as HbbTV Terminal or 'cs' to start as Companion Screen", /^(terminal|cs)$/i)
    .option("-p, --port <port>", "specify the port number of the HbbTV Terminal or CS Launcher. e.g. 8080",parseInt)

program.parse(process.argv);
var port = program.port>0 && program.port || null;
var mode = program.mode || null;
if(port){
    global.PORT = port;
    if(mode == "terminal"){
        require("./start-terminal.js");
    }
    else if(mode == "cs"){
        require("./start-cs.js");
    }
    else {
        program.help();
    }
}
else{
    program.help();
}