#Contribution Guidelines

We love pull requests! Fork the repo, make a pull requests and we'll merge it in ;)

Chat to us at:

https://t.me/fairdatasociety

## History of FDS.js

FDS.js was derived from an initial proof of concept version of (Fairdrop)[https://fairdrop.xyz], an app using the Swarm[https://swarm.ethereum.org] network to create a **totally decentralised** e2e encrypted file-sending platform. This initial version of the application was very quick and dirty, so when I extracted the code, it still was too, but it worked, and it worked well and was verified by real human beings.

As a starting point for a library, this has it's merits and dismerits. There were no tests, the api was in some way clunky and incomplete. But on the other hand, we had something that functioned properly along a solid vertical, and there remained (remains) the relatively conversive task of backfilling tests to enable easier development and maintenance and adding and improving the api. Additionally, there are areas which can be streamlined, and, of course, developed to add more functionality.

## Development Instructions

# Clone the repo.

`git clone git@github.com:fairDataSociety/fds.js.git`


# Install Dependencies

Note: you must use node v10 at present, although [we're working on it!](https://github.com/fairDataSociety/fds.js/issues/61) - we recommend [Node Version Manager](https://github.com/fairDataSociety/fds.js/issues/61).

`npm i`

# Run Tests

We currently have some very high level integration tests which test user stories.

We are working to [improve coverage](https://github.com/fairDataSociety/fds.js/issues/69), as the API settles down.

1. (easy but can be slow) - Run tests against Noordung / Swarm testnets.

`npm run test`

2. (more difficult, but much quicker iterations) - Run tests again local development setup

Run ganache-cli with a seed that corresponds to the faucet's private key. Don't use in production!

`ganache-cli --networkId 235813 -l 80000000 -m 'enough pipe can mule vibrant rice autumn genuine public brisk news erupt'`

This should now be running on http://localhost:8548

Clone and run fds-faucet - you must have [Redis](https://redis.io/) running locally on port 6379.

`git@github.com:fairDataSociety/fds-faucet.git`
`cd fds-faucet`

Create a .env file in the root directory with value:

```
PRIVATE_KEY=54c7eeaf556fd54e719abb35b927e138db2202cea3bd7e9e49ce96a24f963302
ETH_GATEWAY=http://localhost:8545
REDIS_URL=redis://localhost:6379
DRIP_AMT=0.2
AUTH_TOKEN=my-token
```

`node index.js`

Reset the internal nonce counter.

`curl -XPOST http://localhost:3001/reset --data "token=my-token"`

Finally, run your tests locally.

`npm run test-dev`