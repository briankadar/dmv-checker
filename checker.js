const fetch = require('node-fetch');
const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

const twilioClient = twilio(
   TWILIO_ACCOUNT_SID,
   TWILIO_AUTH_TOKEN
);

// Out of state license exchange
const SERVICE_ID = '2cac88e280dfb5f69ecf53ace1a0c00e4d43ba8d14c55a99ee5cb52e824b7389';
const RESERVATION_URL = 'https://nysdmvqw.us.qmatic.cloud/naoa/index.jsp';

const BRANCHES = [
  {
    branchName: 'Manhattan (Harlem)',
    branchId: 'ba4178c73f0cb0c91cf158865f174487cd4dcc79a86bdbbe5502730ed7e7b5b1',
  },
  {
    branchName: 'Manhattan (License Express)',
    branchId: '179ae5ccf5c698b59667f2bdade8a5866f8888edfb922b10caaab2821d50169b',
  },
  {
    branchName: 'Manhattan (Midtown)',
    branchId: '0ea16b72515a86e0cc00d186b249b0ebc61ed10b5289394af9b0cab8de5dafda',
  },
  {
    branchName: 'Nassau (Garden City)',
    branchId: 'bcdeedf10b9b7f92097db7d887686d1df79e2acdcec31334f4efbbbd679c9320',
  },
  {
    branchName: 'Queens (Jamaica)',
    branchId: 'd0099bebf8e51979019b5e45b2c7dfeab9830f0213a4da0cfd569ec145eb07a9',
  },
  {
    branchName: 'Queens (Queens College)',
    branchId: '887df9bcd65c813a07ac3ae5e818d4faec1aa02bb467ea5cb2e1e2e878bfa32a',
  },
  {
    branchName: 'Queens (Springfield Gardens)',
    branchId: '2da2cfd743542bc26618bf7d35559501aee630de80c66a5f884f86d61bc5e780',
  },
];

const targetDates = [
  '2020-10-27',
  '2020-10-28',
  '2020-10-29',
  '2020-10-30',
  '2020-11-05',
].reduce((acc, item) => {
  acc[item] = true;
  return acc;
}, {});

const URL_BASE = 'https://nysdmvqw.us.qmatic.cloud/qwebbook/rest/schedule/branches';

function createURL(branchInfo) {
  return `${URL_BASE}/${branchInfo.branchId}/services/${SERVICE_ID}/dates?_=${Date.now()}`;
}

async function checkBranch(branchInfo) {
  let results;
  try {
    const response = await fetch(createURL(branchInfo));
    results = await response.json();
  } catch (e) {
    console.log('Error fetching data', e);
    return null;
  }
  results = results.filter(item => targetDates[item.date] === true).map(item => item.date);
  return results.length > 0 ? {
    branchInfo,
    results,
  } : null;
}

async function sendMessages(results) {
  const branchTimes = results.map(result => {
    return `${result.branchInfo.branchName}: ${result.results.join(', ')}`
  });
  let body =
    `There are appointments available: \n\n` +
    branchTimes.join('\n') + `\n\n` +
    RESERVATION_URL;

  console.log(body);

  const options = {
    to: '+16463279769',
    from: TWILIO_NUMBER,
    body: body
  };

  console.log('Sending text message...');
  try {
    const result = await twilioClient.messages.create(options);
    console.log('Success sending text!');
  } catch (e) {
    console.log('error sending message');
  }
}


async function runScript() {
  const allBranchChecks = BRANCHES.map(async branchInfo => await checkBranch(branchInfo));
  let allResults = await Promise.all(allBranchChecks);
  allResults = allResults.filter(Boolean);

  if (allResults.length > 0) {
    await sendMessages(allResults);
  }
}

runScript();
