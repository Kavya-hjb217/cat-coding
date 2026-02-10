// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

//store gifs and their URL
const cats = {
  "Coding Cat": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
};

//for singleton pattern to ensure only one webview panel is open at a time
let currentPanel: vscode.WebviewPanel | undefined = undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "cat-coding" is now active!');

  // Register the serializer to handle restarts
  vscode.window.registerWebviewPanelSerializer('catCoding', new CatCodingSerializer(context));

  // The command has been defined in the package.json file and even before implementing it here its available (throws error on calling it) but still visible in command pallete
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "cat-coding.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from Cat Coding!");
    },
  );

  const refactorCommand = vscode.commands.registerCommand(
    "catCoding.doRefactor",
    () => {
      if (!currentPanel) {
        return;
      }
      // Send a message to the webview
      currentPanel.webview.postMessage({ command: "refactor" });
    },
  );

  const yarnCommand = vscode.commands.registerCommand("catCoding.yarn", () => {
    if (currentPanel) {
      currentPanel.webview.postMessage({ command: "giveYarn" });
    }
  });

  // Register the new command for starting a Cat Coding session
  const startCatCoding = vscode.commands.registerCommand(
    "catCoding.start",
    () => {
      // A. Determine which column to show the webview in
      const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

      if (currentPanel) {
        // If it exists, just bring it to the front (reveal it)
        currentPanel.reveal(columnToShowIn);
      } else {
        // Create and show a new webview
        currentPanel = vscode.window.createWebviewPanel(
          "catCoding", // Identifies the type of the webview. Used internally
          "Cat Coding", // Title of the panel displayed to the user
          columnToShowIn || vscode.ViewColumn.One, // Tells VS Code to open the tab in the first editor group (the main area).
          {
            enableScripts: true, //to run JS inside HTML content of webview
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
            ], // Restrict the webview to only load resources from these directories for security.

            // retainContextWhenHidden: true,
           // Keep the webview's context alive even when it's not visible. This means the state and scripts will continue running in the background, allowing for faster reveal and state preservation.
          },
        );

        // Setup the panel logic (listeners, interval, etc)
        setupPanel(context, currentPanel);
      }
    },
  );

  context.subscriptions.push(disposable, refactorCommand, yarnCommand, startCatCoding);
}

// Helper function to setup listeners and content for both new and restored panels
function setupPanel(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
  panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === "alert") {
        vscode.window.showErrorMessage(message.text);
      }
    },
    undefined,
    context.subscriptions,
  );

  //vreate uri for local image path
  const codingPath = vscode.Uri.joinPath(context.extensionUri, "media", "coding.gif");
  const compilingPath = vscode.Uri.joinPath(context.extensionUri, "media", "compiling.gif");

  //convert path to URI
  const codingUri = panel.webview.asWebviewUri(codingPath);
  const compilingUri = panel.webview.asWebviewUri(compilingPath);

  //update the cats object with local URIs
  cats["Coding Cat"] = codingUri.toString();
  cats["Compiling Cat"] = compilingUri.toString();

  const stylePath = vscode.Uri.joinPath(context.extensionUri, "media", "style.css");
  const styleUri = panel.webview.asWebviewUri(stylePath);

  // Set initial HTML content once
  panel.webview.html = getWebviewContent("Coding Cat", styleUri, panel.webview);

  let iteration = 0;
  const updateWebview = () => {
    const cat = iteration++ % 2 ? "Compiling Cat" : "Coding Cat";
    panel.title = cat;
    panel.webview.postMessage({
      command: "changeGif",
      src: cats[cat as keyof typeof cats]
    });
  };

  const interval = setInterval(updateWebview, 5000);

  panel.onDidChangeViewState(
    (e) => {
      if (e.webviewPanel.visible) {
        console.log("Cat is visible!");
      }
    },
    null,
    context.subscriptions,
  );

  panel.onDidDispose(
    () => {
      clearInterval(interval);
      currentPanel = undefined;
    },
    null,
    context.subscriptions,
  );
}

// The Serializer class that handles restoring the panel after VS Code restarts
class CatCodingSerializer implements vscode.WebviewPanelSerializer {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
    // VS Code has "remembered" this panel. We need to re-initialize it.
    console.log(`Restoring Cat Coding with state: ${JSON.stringify(state)}`);
    
    // Set the global reference to this restored panel
    currentPanel = webviewPanel;
    
    // Setup the restored panel (attach listeners, restore HTML)
    setupPanel(this.context, currentPanel);
  }
}

// Helper function to generate the full HTML document
function getWebviewContent(cat: keyof typeof cats, styleUri: vscode.Uri, webview: vscode.Webview) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'unsafe-inline'; style-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${styleUri}">
    <title>Cat Coding</title>
</head>
<body data-vscode-context='{"webviewSection": "main"}'>
    <h1 id="lines-of-code-counter">0</h1>
    <img id="cat-image" src="${cats[cat]}" width="300" />
    <div id="yarn-bin" style="font-size: 2rem;"></div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const counter = document.getElementById('lines-of-code-counter');
            const yarnBin = document.getElementById('yarn-bin');
            const catImage = document.getElementById('cat-image');

            // Restore state
            const previousState = vscode.getState();
            let count = previousState ? previousState.count : 0;
            counter.textContent = count;

            setInterval(() => {
                counter.textContent = count++;
                // Save state
                vscode.setState({ count: count });

                if (Math.random() < 0.01 * count) {
                    vscode.postMessage({
                        command: 'alert',
                        text: '🐛 Bug detected on line ' + count
                    });
                }
            }, 1000);

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'refactor':
                        count = Math.ceil(count * 0.5);
                        counter.textContent = count;
                        vscode.setState({ count: count });
                        break;
                    case 'giveYarn':
                        yarnBin.textContent += '🧶';
                        break;
                    case 'changeGif':
                        catImage.src = message.src;
                        break;
                }
            });
        }());
    </script>
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}