import { render } from "preact";
import { Editor } from "./Editor";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  render(<Editor />, root);
}
