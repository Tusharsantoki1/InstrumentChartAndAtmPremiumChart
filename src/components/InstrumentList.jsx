
import { INDEXES } from "../constants/instruments";
import IndexCard from "./IndexCard";


export default function InstrumentList({ selectedIndex, onSelect }) {
  return (
    <div className="index-grid">
      {INDEXES.map((name) => (
        <IndexCard
          key={name}
          name={name}
          isSelected={selectedIndex === name}
          onClick={() => onSelect(name)}
        />
      ))}
    </div>
  );
}