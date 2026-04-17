import { useWalletContext } from '../context/WalletContext';

const useWallet = () => {
  return useWalletContext();
};

export default useWallet;
