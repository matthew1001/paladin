import { ContractTransactionResponse, EventLog } from 'ethers';

export const getEvents = async (response: ContractTransactionResponse) => {
  const receipt = await response.wait();
  return receipt?.logs?.filter(log => log instanceof EventLog) as EventLog[];
};

export const getEvent = async (response: ContractTransactionResponse) => {
  const events = await getEvents(response);
  return events.pop();
};