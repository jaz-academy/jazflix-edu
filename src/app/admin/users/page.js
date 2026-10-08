import Navbar from "@/components/Navbar";
import TableUsers from "@/components/TableUsers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

async function getUsers() {
  await connectDB();
  const users = await User.find().sort({ _id: -1 }).lean();
  return JSON.parse(JSON.stringify(users));
}

export default async function AdminUsers() {
  const users = await getUsers();

  return (
    <>
      <Navbar />
      <div className="my-8" />
      <TableUsers users={users} />
    </>
  );
}
