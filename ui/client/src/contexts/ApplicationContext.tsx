import { useBidxQueries } from "@/queries/bidx";
import { createContext } from "react";
import { ErrorDialog } from "../dialogs/Error";
import { constants } from "@/components/config";
import { useTransportQueries } from "@/queries/transport";

interface IApplicationContext {
  colorMode: {
    toggleColorMode: () => void;
  };
  lastBlockWithTransactions: number;
}

export const ApplicationContext = createContext({} as IApplicationContext);

interface Props {
  colorMode: {
    toggleColorMode: () => void;
  };
  children: JSX.Element;
}

export const ApplicationContextProvider = ({ children, colorMode }: Props) => {
  const { useQueryIndexedTransactions } = useBidxQueries();
  const { useNodeName } = useTransportQueries();
  const { data: nodeName } = useNodeName();
  console.log(nodeName);
  const { data: lastBlockWithTransactions, error } =
    useQueryIndexedTransactions(
      {
        limit: 1,
        sort: ["blockNumber DESC", "transactionIndex DESC"],
      },
      constants.UPDATE_FREQUENCY_MILLISECONDS
    );

  return (
    <ApplicationContext.Provider
      value={{
        lastBlockWithTransactions:
          lastBlockWithTransactions && lastBlockWithTransactions.length > 0
            ? lastBlockWithTransactions[0].blockNumber
            : 0,
        colorMode,
      }}
    >
      {children}
      <ErrorDialog dialogOpen={!!error} message={error?.message ?? ""} />
    </ApplicationContext.Provider>
  );
};
