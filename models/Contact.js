class Contact {

  constructor(attrs){
    if(attrs.subdomain === undefined) throw new Error('subdomain must be defined');
    if(attrs.publicKey === undefined) throw new Error('publicKey must be defined');
    if(attrs.mailboxAddress === undefined) throw new Error('mailboxAddress must be defined');
    if(attrs.feedLocationHash === undefined) throw new Error('feedLocationHash must be defined');

    this.subdomain = attrs.subdomain;
    this.publicKey = attrs.publicKey;
    this.mailboxAddress = attrs.mailboxAddress;
    this.feedLocationHash = attrs.feedLocationHash;
    return this;
  }

  toJSON(){
    return {
      subdomain: this.subdomain,
      publicKey: this.publicKey,
      mailboxAddress: this.mailboxAddress,
      feedLocationHash: this.feedLocationHash
    }
  }

}

module.exports = Contact;