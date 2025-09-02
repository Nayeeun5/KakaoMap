import PlaceCard from "./PlaceCard";

export default function PlaceList({ places = [] }) {
  return (
    <ul className="divide-y divide-gray-100">
      {places.map((p) => (
        <li key={p.id} className="py-0.5">
          <PlaceCard place={p} layout="list" />
        </li>
      ))}
    </ul>
  );
}
