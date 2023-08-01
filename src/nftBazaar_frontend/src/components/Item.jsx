import React, { useEffect, useState } from "react";
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft/index";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token_backend/index";
import { Principal } from "@dfinity/principal";
import { nftBazaar_backend } from "../../../declarations/nftBazaar_backend/index";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";
import Button from "./Button";

function Item(props) {

  const [shouldDisplay, setDisplay] = useState(true);
  const [priceLabel, setPriceLabel] = useState();
  const [priceInput, setPriceInput] = useState();
  const [sellStatus, setStatus] = useState("");
  const [button, setButton] = useState();
  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [blur, setBlur] = useState();
  const [loaderHidden, setHidden] = useState(true);
  const id = props.id;
  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localHost });

  //REMOVE THE LINE BELOW WHEN DEPLOYING ON BLOCKCHAIN
  //agent.fetchRootKey();

  let NFTActor;

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, { agent, canisterId: id });

    const [name, owner, imageData, nftIsListed, originalOwner, price] = await Promise.all([
      NFTActor.getName(),
      NFTActor.getOwner(),
      NFTActor.getAsset(),
      props.role === "collection" ? nftBazaar_backend.isListed(props.id) : null,
      props.role === "discover" ? nftBazaar_backend.getOriginalOwner(props.id) : null,
      props.role === "discover" ? nftBazaar_backend.getListedNFTPrice(props.id) : null
    ]);

    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(new Blob([imageContent.buffer], { type: "image/png" }));
    setName(name);
    setOwner(owner.toText());
    setImage(image);

    if (props.role === "collection") {
      if (nftIsListed) {
        setOwner("NFT Bazaar");
        setBlur({ filter: "blur(4px)" });
        setStatus("Listed");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    } else if (props.role === "discover") {
      if (originalOwner.toText() !== CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text="Buy" />);
      }

      setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
    }
  }


  async function handleBuy() {
    setHidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("bw4dl-smaaa-aaaaa-qaacq-cai")
    })
    const sellerId = await nftBazaar_backend.getOriginalOwner(props.id);
    const itemPrice = await nftBazaar_backend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    if (result == "Success") {
      const transferResult = await nftBazaar_backend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log(transferResult);
      setHidden(true);
      setDisplay(false);
    }
  }

  useEffect(() => { loadNFT(); }, []);
  let price;
  function handleSell() {
    setPriceInput(<input
      placeholder="Price in ADI"
      type="number"
      className="price-input"
      value={price}
      onChange={(e) => price = e.target.value}
    />);
    setButton(<Button handleClick={sellItem} text={"Confirm"} />)
  }

  async function sellItem() {
    setBlur({ filter: "blur(4px)" });
    setHidden(false);
    const listingResult = await nftBazaar_backend.listItem(props.id, Number(price));
    if (listingResult == "Success") {
      const bazaarID = await nftBazaar_backend.getBazaarCanisterID();
      const transferResult = await NFTActor.transferOwnership(bazaarID, true);
      if (transferResult == "Success") {
        setHidden(true);
        setButton();
        setPriceInput();
        setOwner("NFT Bazaar")
        setStatus("Listed");
      }
    }
  }

  return (
    <div style={{ display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
