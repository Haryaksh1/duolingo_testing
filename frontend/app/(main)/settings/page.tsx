import { api } from "@/lib/api";

import { SettingsForm } from "./settings-form";

const SettingsPage = async () => {
  const me = await api.me();
  return <SettingsForm me={me} />;
};

export default SettingsPage;
