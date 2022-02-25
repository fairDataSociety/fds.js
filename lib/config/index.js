const config = {
  swarmTimeout: 1000 * 60 * 4,
  tokenName: 'gas',
  beeGateway: 'https://gateway.fairdatasociety.org',
  ethGateway: 'https://xdai.fairdatasociety.org',
  faucetAddress: 'https://faucet-xdai.fairdatasociety.org/gimmie',
  chainID: '100',
  httpTimeout: 1000,
  walletVersion: 1,
  ensConfig: {
    domain: 'fairdrop.eth',
    registryAddress: '0xc064e0b7152Db3a5a3e58176CeA0A62d2E6A2D89',
    subdomainRegistrarAddress: '0x3C56F2Cc894ef5E8A7c37EF35d7b2b501c95ab7D',
    resolverContractAddress: '0xfe38502762621f368E487240f18273246e591c95',
  },
}

export default config
