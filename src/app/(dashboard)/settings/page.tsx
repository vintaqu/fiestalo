import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";

async function getProfileData(userId: string) {
  return db.user.findUnique({
    where:  { id: userId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      image:     true,
      role:      true,
      createdAt: true,
      profile: {
        select: {
          bio:     true,
          phone:   true,
          city:    true,
          country: true,
          website: true,
          avatar:  true,
        },
      },
    },
  });
}

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getProfileData(session.user.id);
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Actualiza tu información personal y cómo te ven otros usuarios
        </p>
      </div>
      <ProfileForm user={user as any} />
    </div>
  );
}
