const express = require("express");
const cors = require("cors"); // Import cors middleware
const { exec } = require("child_process");
const fs = require("fs");
const pty = require("node-pty"); // Import node-pty library
const os = require("os");

const app = express();
const port = process.env.PORT || 4000;

// Use CORS middleware to allow requests from all origins
app.use(cors("*"));
app.use(express.json());

app.post("/run", (req, res) => {
  const cppCode = req.body.code; // C++ code
  const inputs = req.body.inputs || []; // Inputs for the program
  const filename = "program.cpp";

  // Write the C++ code to a file
  fs.writeFileSync(filename, cppCode);

  // Compile the C++ code
  exec(`g++ ${filename} -o program`, (error, stdout, stderr) => {
    if (error) {
      return res.json({ output: stderr });
    }

    // Join inputs with newlines and pipe them to the compiled program
    const inputStr = inputs.join("\n");

    exec(`echo "${inputStr}" | ./program`, (runError, runStdout, runStderr) => {
      if (runError) {
        return res.json({ output: runStderr });
      }
      res.json({ output: runStdout });
    });
  });
});





const shell = os.platform() === "win32" ? "cmd.exe" : "bash";
// Create a persistent terminal session using node-pty
const ptyProcess = pty.spawn(shell, [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env,
});

// Store the terminal output
let terminalOutput = "";

// Listen for data from the terminal
ptyProcess.on("data", (data) => {
  terminalOutput += data;
});

app.post("/commandrun", (req, res) => {
  const { command } = req.body;

  // Send the command to the terminal
  ptyProcess.write(`${command}\r`);

  // Give the terminal a little time to process the command
  setTimeout(() => {
    // Send the terminal output back to the client
    res.json({ output: terminalOutput });

    // Clear the terminal output for the next command
    terminalOutput = "";
  }, 100);
});

app.get("/terminal-output", (req, res) => {
  res.json({ output: terminalOutput });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
