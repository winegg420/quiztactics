import React from "react";
import ReactDOM from "react-dom/client";
import KartArkaPlan from "../KartArkaPlan.jsx";
const Ic = () => (<><b style={{ fontSize: 20 }}>idagg</b><span style={{ marginLeft: 12 }}>Lv 17 · Bilge</span></>);
ReactDOM.createRoot(document.getElementById("root")).render(
  <div style={{ width: 358, padding: 0 }}>
    {["su", "kar", "yaprak"].flatMap((t) => [100, 42].map((h) => <div key={t + h} style={{ height: h, marginBottom: 10 }}><KartArkaPlan tur={t} yukseklik={h}><Ic /></KartArkaPlan></div>))}
    {["su", "kar", "yaprak"].map((t) => <div key={"k" + t} style={{ height: 100, marginBottom: 10, position: "relative" }} className="abp-sahip"><KartArkaPlan tur={t} katman duzen="dikey" /><Ic /></div>)}
  </div>
);
