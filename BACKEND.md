# Google Apps Script Backend Setup

To connect this app to a Google Sheet, follow these steps:

1. Open your Google Sheet.
2. Go to **Extensions** > **Apps Script**.
3. Replace the code in `Code.gs` with the following:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  const taskId = e.parameter.taskId;
  const token = e.parameter.token;
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tasks"); // Change to your sheet name
  const data = sheet.getDataRange().getValues();
  
  if (action === "verify") {
    // Check if taskId and token match a row in the sheet
    // Assuming taskId is in column A and token is in column E
    let exists = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === taskId && data[i][4] === token) {
        exists = true;
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ exists: exists }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inspections"); // Change to your sheet name
  
  // Append the inspection data
  sheet.appendRow([
    new Date(),
    data.taskId,
    data.roomId,
    data.inspectorName,
    data.roomCondition,
    data.images.length,
    JSON.stringify(data.images) // You might want to handle images differently
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Click **Deploy** > **New Deployment**.
5. Select **Web App**.
6. Set **Execute as** to "Me" and **Who has access** to "Anyone".
7. Copy the **Web App URL**.
8. Paste this URL into your `.env` file as `GOOGLE_APPS_SCRIPT_URL`.

## Expected Sheet Structure (Tasks)
| Task ID | Inquiry ID | Room ID | Lease ID | Token |
|---------|------------|---------|----------|-------|
| RTI-A101... | RI-A101... | A101 | | RTI-A101... |
