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
        //cretae and show a new webview
        currentPanel = vscode.window.createWebviewPanel(
          "catCoding", // Identifies the type of the webview. Used internally
          "Cat Coding", // Title of the panel displayed to the user
          columnToShowIn || vscode.ViewColumn.One, // Tells VS Code to open the tab in the first editor group (the main area).
          {
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
            ], // Restrict the webview to only load resources from these directories for security.
          },
        );


        

        //vreate uri for local image path
        const codingPath =vscode.Uri.joinPath(context.extensionUri, "media", "coding.gif");
        const compilingPath =vscode.Uri.joinPath(context.extensionUri, "media", "compiling.gif");


        //convert path to URI 
        const codingUri = currentPanel.webview.asWebviewUri(codingPath);
        const compilingUri = currentPanel.webview.asWebviewUri(compilingPath);

        //update the cats object with local URIs
        cats["Coding Cat"] = codingUri.toString();
        cats["Compiling Cat"] = compilingUri.toString();

        let iteration = 0;
        const updateWebview = () => {
          const cat = iteration++ % 2 ? "Compiling Cat" : "Coding Cat";
          // Update the tab title dynamically
          if (currentPanel) {
            currentPanel.title = cat;
            // Set the HTML content
            currentPanel.webview.html = getWebviewContent(
              cat as keyof typeof cats,
            ); //Changing the type of string changes the key of cats and thus gif being displayed, so we need to typecast it to the keys of cats object
          }
        };
        updateWebview();

        //JS function to tells the extension to run our updateWebview function at regular intervals
        const interval = setInterval(updateWebview, 5000); // Update every 5 seconds

        // Update contents based on view state changes
        currentPanel.onDidChangeViewState(
          //event listener provided by webView api
          (e) => {
            const panel = e.webviewPanel; //the webview panel whose view state has changed
            if (panel.visible) {
              console.log("Cat is visible!");
            }
          },
          null,
          context.subscriptions,
        );

        // Clean up the interval when the panel is closed
        currentPanel.onDidDispose(
          () => {
            //event listener provided by webView api
            clearInterval(interval); //stops the timer . stops memory leak
            // Reset the current panel reference
            currentPanel = undefined;
          },
          null, //no special context
          context.subscriptions, //a list of disposables to dispose when the extension is deactivated
        );
      }
    },
  );

  context.subscriptions.push(disposable, startCatCoding);
}

// Helper function to generate the full HTML document


function getWebviewContent(cat: keyof typeof cats) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
</head>
<body>
    <img src="${cats[cat]}" width="300" />
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
