import { expect } from 'chai';
import 'mocha';
import { Credential } from '../src/VC/Credential';
import { VerifiableCredential } from '../src/VC/VerifiableCredential';
import { SchemaManager } from './../src/VC/SchemaManager';
import { Schema } from '../src/VC/Schema';
import { DID, DIDDocument } from '../src';
import { CreateRandomDID } from '../src/Helpers/CreateRandomDID';
import { DIDPublisher } from '../src/IOTA/DIDPublisher';
import { GenerateSeed } from '../src/Helpers/GenerateSeed';
import { Presentation } from '../src/VC/Presentation';
import { VerifiablePresentation } from '../src/VC/VerifiablePresentation';
import { VerificationErrorCodes } from '../src/VC/VerifiableObject';
import { Proof, ProofBuildingMethod, ProofParameters } from '../src/VC/Proof/Proof';
import { ProofTypeManager } from '../src/VC/Proof/ProofTypeManager';
import { DecodeProofDocument } from '../src/Helpers/DecodeProofDocument';

const provider : string = "https://nodes.devnet.iota.org:443";

let RandomDID : DID = new DID("did:iota:main:ABCABCABC");

describe('Schemas', function() {
    let schema : Schema;
    let testObject : {};
    
    let SchemaList : string[] = ['DIDAuthenticationCredential', 'DomainValidatedCertificate', 'EclassCredential'];
    it('Should contain a list of default schemas', function() {
        expect(SchemaManager.GetInstance().GetSchemaNames()).to.deep.equal(SchemaList);
    });
    
    it('Should be able to add an extra schema', function() {
        SchemaList.push("IOTATrainingCertificate");
        SchemaManager.GetInstance().AddSchema("IOTATrainingCertificate", {
            type : "object",
            required : ["trainingTitle", "participant", "participationDate"],
            properties : {
                "trainingTitle" : { 
                    type : "string"
                },
                "participant" : { 
                    type : "string"
                },
                "participationDate" : { 
                    type : "string"
                }
            }
        });
        expect(SchemaManager.GetInstance().GetSchemaNames()).to.deep.equal(SchemaList);
    });

    it('Should validate correctly', function() {
        schema = SchemaManager.GetInstance().GetSchema("IOTATrainingCertificate");
        testObject = {
            "trainingTitle" : "IOTA Developer Training",
            "participant" : "Jelly von Yellowburg",
            "participationDate" : new Date().toUTCString()
        };
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.true;
    });

    it('Should validate with extra fields', function() {
        let testObject2 : {} = { ...testObject, ...{"ExtraField" : "Hello World"}};
        expect(schema.DoesObjectFollowSchema(testObject2)).to.be.true;
    });

    it('Should fail with a missing field', function() {
        testObject = {
            "trainingTitle" : "IOTA Developer Training",
            "participant" : "Jelly von Yellowburg"
        };
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.false;
    });

    it('Should fail with a wrong type', function() {
        testObject = {
            "trainingTitle" : "IOTA Developer Training",
            "participant" : "Jelly von Yellowburg",
            "participationDate" : 12
        };
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.false;
    });

    it('Should correctly verify DIDAuthenticationCredential', function() {
        schema = SchemaManager.GetInstance().GetSchema("DIDAuthenticationCredential");
        testObject = {
            "DID" : "did:iota:main:123123"
        }
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.true;
    });

    it('Should correctly verify DomainValidatedCertificate', function() {
        schema = SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate");
        testObject = {
            "id" : "did:iota:main:123123",
            "domains" : ["*.iota.org", "*.reddit.com"]
        }
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.true;
    });

    it('Should not trust a random DID', function() {
        expect(schema.IsDIDTrusted(RandomDID)).to.be.false;
    });

    it('Should add and trust a DID', function() {
        schema.AddTrustedDID(RandomDID);
        expect(schema.IsDIDTrusted(RandomDID)).to.be.true;
    })
});

describe('Verifiable Credentials', async function() {
    /*let credential : Credential;

    before(async function() {
        this.timeout(20000);
        IssuerDIDDocument = await CreateRandomDID("keys-1");
        issuerSeed = GenerateSeed();
        let publisher : DIDPublisher = new DIDPublisher(provider, issuerSeed);
        issuerRoot = await publisher.PublishDIDDocument(IssuerDIDDocument, "DIDTEST", 9);
        SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate").AddTrustedDID(IssuerDIDDocument.GetDID());
        SubjectDIDDocument = await CreateRandomDID("keys-1");
    });

    it('Should create a Credential, which cannot be verified yet', function() {
        let domainCertificate = {
            id : SubjectDIDDocument.GetDID().GetDID(),
            domains : [
                "blog.iota.org",
                "coordicide.iota.org",
                "docs.iota.org"
            ]
        };
        credential = Credential.Create(SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate"), IssuerDIDDocument.GetDID(), domainCertificate);
    });

    it('Should be able to add a RSA proof and verify the Verifiable Credential', function() {
        let credProof : Proof = ProofTypeManager.GetInstance().CreateProofWithBuilder("RsaSignature2018", { 'issuer' : IssuerDIDDocument, 'issuerKeyId' : "keys-1", 'challengeNonce' : "123" });
        credProof.Sign(credential.EncodeToJSON());
        TestCredential = VerifiableCredential.Create(credential, credProof);
        expect(TestCredential.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });

    it('Should be able to verify a Verifiable Presentation', function() {
        let presentation : Presentation = Presentation.Create([TestCredential]);
        let credProof : Proof =  ProofTypeManager.GetInstance().CreateProofWithBuilder("RsaSignature2018", { 'issuer' : SubjectDIDDocument, 'issuerKeyId' : "keys-1", 'challengeNonce' : "456" });
        credProof.Sign(presentation.EncodeToJSON());
        let verifiablePresentation : VerifiablePresentation = VerifiablePresentation.Create(presentation, credProof);
        expect(verifiablePresentation.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });*/
    
    let IssuerDIDDocument : DIDDocument;
    let issuerSeed : string;
    let SubjectDIDDocument : DIDDocument;
    let subjectSeed : string;

    let credential : Credential;
    let verifiableCredential : VerifiableCredential;
    let proofMethod : ProofBuildingMethod;
    let VCProof : Proof;
    let presentation : Presentation;
    let verifiablePresentation : VerifiablePresentation;
    let presentationProof : Proof;

    before(async function() {
        this.timeout(20000);
        issuerSeed = GenerateSeed();
        IssuerDIDDocument = CreateRandomDID(issuerSeed);
        let publisher : DIDPublisher = new DIDPublisher(provider, issuerSeed);
        await publisher.PublishDIDDocument(IssuerDIDDocument, "DIDTEST", 9);
        SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate").AddTrustedDID(IssuerDIDDocument.GetDID());
        subjectSeed = GenerateSeed();
        SubjectDIDDocument = CreateRandomDID(subjectSeed);
        proofMethod = ProofTypeManager.GetInstance().GetProofBuilder("RsaSignature2018");
    });

    it('Should be able to a credential', function() {
        let domainCertificate = {
            id : SubjectDIDDocument.GetDID().GetDID(),
            domains : [
                "blog.iota.org",
                "coordicide.iota.org",
                "docs.iota.org"
            ]
        };
        credential = Credential.Create(SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate"), IssuerDIDDocument.GetDID(), domainCertificate);
        expect(credential.GetCredential()).to.not.be.undefined;
    });

    it('Should be able to Encode / Decode a credential to be the same', function() {
        let importedCredential : Credential = Credential.DecodeFromJSON(credential.EncodeToJSON());
        expect(importedCredential.EncodeToJSON()).to.deep.equal(credential.EncodeToJSON());
    });

    it('Should be able to create, sign and verify a Verifiable Credential' , function() {
        VCProof = proofMethod({'issuer' : IssuerDIDDocument, 'issuerKeyId' : "keys-1"});
        VCProof.Sign(credential.EncodeToJSON());
        verifiableCredential = VerifiableCredential.Create(credential, VCProof);
        expect(verifiableCredential.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });

    it('Should be able to Encode / Decode a Verifiable Credential and still verify', async function() {
        let proofParameters : ProofParameters = await DecodeProofDocument(VCProof.EncodeToJSON(), provider);
        let importedVerifiableCredential : VerifiableCredential = VerifiableCredential.DecodeFromJSON(verifiableCredential.EncodeToJSON(), proofParameters);
        expect(importedVerifiableCredential).to.deep.equal(VerificationErrorCodes.SUCCES);
        expect(importedVerifiableCredential.EncodeToJSON()).to.deep.equal(verifiableCredential.EncodeToJSON());
    });

    it('Should test all Verification Error codes for Verifiable Credentials', function() {
        
    });

    it('Should be able to create a presentation from a Verifiable Credential', function() {
        presentation = Presentation.Create([verifiableCredential]);
        expect(presentation.EncodeToJSON().verifiableCredential).to.deep.equal(verifiableCredential.EncodeToJSON());
    });

    it('Should be able to Encode / Decode a credential to be the same', async function() {
        let importPresentation : Presentation = await Presentation.DecodeFromJSON(presentation.EncodeToJSON(), provider);
        expect(importPresentation.EncodeToJSON()).to.deep.equal(presentation.EncodeToJSON());
    });

    it('Should be able to create, sign and verify the Verifiable Presentation', function() {
        presentationProof = proofMethod({'issuer' : SubjectDIDDocument, 'issuerKeyId' : "keys-1", challengeNonce : "123"});
        presentationProof.Sign(presentation.EncodeToJSON());
        verifiablePresentation = VerifiablePresentation.Create(presentation, presentationProof);
        expect(verifiablePresentation.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });

    it('Should be able to Encode / Decode a Verifiable Presentation and still verify', async function() {
        console.log(presentationProof.EncodeToJSON());
        console.log(verifiablePresentation.EncodeToJSON());//Shouldn't this be enough to integrate into VerifiableObject and do DecodeProofDocument?
        let proofParameters : ProofParameters = await DecodeProofDocument(presentationProof.EncodeToJSON(), provider);
        let importVerifiablePresentation : VerifiablePresentation = await VerifiablePresentation.DecodeFromJSON(verifiablePresentation.EncodeToJSON(), provider, proofParameters);
        expect(importVerifiablePresentation).to.deep.equal(VerificationErrorCodes.SUCCES);
        expect(importVerifiablePresentation.EncodeToJSON()).to.deep.equal(verifiablePresentation.EncodeToJSON());
    });

    it('Should test all Verification Error codes for Verifiable Presentation', function() {

    });


    /*it('Should be able to export and import to still verify', async function() {
        this.timeout(20000);
        let ExportJSON : any = TestCredential.GetJSONDIDDocument();
        let ImportCredential : VerifiableCredential = VerifiableCredential.ImportVerifiableCredential(ExportJSON);
        let Proof : RSAProof = new RSAProof(ImportCredential, await DIDDocument.readDIDDocument(provider, issuerRoot), "keys-1");
        ImportCredential.SetProof(Proof);
        expect(ImportCredential.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });*/
   
});

describe("Challenges", function() {

});