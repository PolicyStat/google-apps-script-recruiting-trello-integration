var Trello = function(key, secretToken){
  this.key = key;
  this.secretToken = secretToken;

  var apiRoot = 'https://api.trello.com/1/';
  var apiMyBoards = apiRoot + 'members/me/boards';
  var apiBoardLists = apiRoot + 'boards/id/lists';
  var apiCreateCard = apiRoot + 'cards';

  this.request = function(endpoint, params, method) {
    var options = {
      method: method,
    }
    var urlParams = {
      key: this.key,
      token: this.secretToken,
    }
    for (var key in params) {
      urlParams[key] = params[key];
    }
    var url = buildURL(endpoint, urlParams);
    var response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response);
  }

  this.getBoardByName = function(boardName){
    var params = {
      fields: 'name',
    }
    var boards = this.request(apiMyBoards, params, 'get');
    for(var i=0; i<boards.length; ++i) {
      var board = boards[i];
      if (board['name'] == boardName) {
        return board['id'];
      }
    }
    console.log('Trello board "', boardName, '" was not found.');
    return null;
  }

  this.getBoardListNameStartsWith = function(boardName, listName) {
    var boardId = this.getBoardByName(boardName);
    if (boardId == null) {
      return null;
    }
    var params = {
      fields: 'name',
    }
    var endpoint = apiBoardLists.replace('id', boardId);
    var boardLists = this.request(endpoint, params, 'get');
    for(var i=0; i<boardLists.length; ++i) {
      var boardList = boardLists[i];
      if (boardList['name'].indexOf(listName) == 0) {
        return boardList['id'];
      }
    }
    console.log('Trello list "', listName, '" was not found.');
    return null;
  }

  this.createCard = function(card) {
    return this.request(apiCreateCard, card, 'post');
  }
};

function onFormSubmit(event) {
  var sheetName = SpreadsheetApp.getActiveSheet().getName();
  var masterSheetName = PropertiesService.getScriptProperties().getProperty('MASTER_SHEET_NAME')
  var masterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(masterSheetName);

  // Add a new row to the master sheet using the submitted values, except we want the active sheet name at the beginning
  var newRowForMasterSheet = [sheetName].concat(event.values);
  masterSheet.appendRow(newRowForMasterSheet);

  createTrelloCard(sheetName, event.namedValues);
}

function createTrelloCard(sheetName, applicantSubmission) {
  var properties = PropertiesService.getScriptProperties();
  var key = properties.getProperty('TRELLO_KEY');
  var secretToken = properties.getProperty('TRELLO_SECRET_KEY');
  var trello = new Trello(key, secretToken);
  var boardPrefix = properties.getProperty('TRELLO_BOARD_NAME_PREFIX');
  var boardName = boardPrefix + sheetName;
  var boardListName = properties.getProperty('TRELLO_BOARD_LIST_NAME_PREFIX');
  var jobBoardList = trello.getBoardListNameStartsWith(boardName, boardListName);

  if (jobBoardList == null) {
    return null;
  }

  var applicantName = applicantSubmission['First name'] + ' ' + applicantSubmission['Last name'];
  var description = 'Email address: ' + applicantSubmission['Email Address'] + '\n';
  description += 'Phone: ' + applicantSubmission['Phone number'] + '\n';

  var card = {
    idList: jobBoardList,
    name: applicantName,
    desc: description,
    urlSource: applicantSubmission['Resume'],
  }
  return trello.createCard(card);
}

function serializeParams(params) {
  var str = "";
  for (var key in params) {
    if (str != "") {
      str += "&";
    }
    str += key + "=" + encodeURIComponent(params[key]);
  }
  return str;
}

function buildURL(url, params) {
  return url + '?' + serializeParams(params);
}

function test_createTrelloCard() {
  console.log('Testing createTrelloCard');
  var sheetName = 'Product: Software Engineer';
  var applicantSubmission = {
    'First name': 'Tyrion',
    'Last name': 'Lannister',
    'Email Address': 'tyrion@casterlyrock.com',
    'Phone number': '123456',
    'Resume': 'http://www.casterlyrock.com',
  }
  createTrelloCard(sheetName, applicantSubmission);
}
