import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Language } from "./seller-copy";
export type Plan = "with" | "without";
export type Details = {
  address: string;
  city: string;
  postal: string;
  type: string;
  price: string;
  broker: string;
  timeline: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  language: Language;
  notes: string;
  consent: boolean;
};
export type Photo = { file: File; url: string };
export type Visit = { date: string; time: string; name: string };
export type Document = { name: string; size: number; url: string };
export type Buyer = {
  name: string;
  initials: string;
  source: string;
  status: number;
};
type Project = {
  plan: Plan;
  setPlan: Dispatch<SetStateAction<Plan>>;
  form: Details;
  setForm: Dispatch<SetStateAction<Details>>;
  photos: Photo[];
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  services: string[];
  setServices: Dispatch<SetStateAction<string[]>>;
  completed: boolean;
  setCompleted: Dispatch<SetStateAction<boolean>>;
  sample: boolean;
  setSample: Dispatch<SetStateAction<boolean>>;
  visits: Visit[];
  setVisits: Dispatch<SetStateAction<Visit[]>>;
  docs: Document[];
  setDocs: Dispatch<SetStateAction<Document[]>>;
  buyers: Buyer[];
  setBuyers: Dispatch<SetStateAction<Buyer[]>>;
};
const ProjectContext = createContext<Project | null>(null);
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("without");
  const [form, setForm] = useState<Details>({
    address: "",
    city: "",
    postal: "",
    type: "0",
    price: "",
    broker: "0",
    timeline: "0",
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "0",
    language: "fr",
    notes: "",
    consent: false,
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [sample, setSample] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([
    { name: "Camille R.", initials: "CR", source: "Web", status: 0 },
    { name: "Alex M.", initials: "AM", source: "Web", status: 1 },
    { name: "Lin W.", initials: "LW", source: "Web", status: 2 },
  ]);
  const photoRef = useRef(photos);
  useEffect(() => {
    photoRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photoRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    [],
  );
  const docRef = useRef(docs);
  useEffect(() => {
    docRef.current = docs;
  }, [docs]);
  useEffect(
    () => () => docRef.current.forEach((d) => URL.revokeObjectURL(d.url)),
    [],
  );
  return (
    <ProjectContext.Provider
      value={{
        plan,
        setPlan,
        form,
        setForm,
        photos,
        setPhotos,
        services,
        setServices,
        completed,
        setCompleted,
        sample,
        setSample,
        visits,
        setVisits,
        docs,
        setDocs,
        buyers,
        setBuyers,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
export function useProject() {
  const value = useContext(ProjectContext);
  if (!value) throw Error("ProjectProvider is required");
  return value;
}
