import { default as MessageFactory } from "../src/message-factory.mjs"

(async () => {
  const messages = await MessageFactory.MESSAGES;
  const json = JSON.stringify(messages, null, 2);
  console.log('const messages = ', json);
  console.log('export default messages');
})()
