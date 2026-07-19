import axios from "axios";
async function run() {
  try {
    const res = await axios.post("http://localhost:3000/users/login", { email: "admin@ghazanfar.com", password: "admin@123" });
    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}
run();
