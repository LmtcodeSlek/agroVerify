import React from 'react';

const TxStatus = ({ status, hash }) => {
  if (!status) return null;

  return (
    <div className={`tx-status tx-${status}`}>
      <div className="tx-title">Transaction {status}</div>
      {hash ? <div className="tx-hash">{hash}</div> : null}
    </div>
  );
};

export default TxStatus;
