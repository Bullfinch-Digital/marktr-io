import { useState } from "react";
import { ArrowLeft, Plus, MoreVertical, Mail, UserCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  status: "Active" | "Pending";
  avatar: string;
}

export default function TeamSettings() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Editor" | "Viewer">("Editor");

  const totalSeats = 3;
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@company.com",
      role: "Admin",
      status: "Active",
      avatar: "#A9B7DC",
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "michael@company.com",
      role: "Editor",
      status: "Active",
      avatar: "#EBFD84",
    },
  ]);

  const seatsUsed = teamMembers.length;
  const hasAvailableSeats = seatsUsed < totalSeats;

  const handleInvite = () => {
    if (!hasAvailableSeats) {
      return;
    }
    if (inviteEmail) {
      // Mock invite logic
      setTeamMembers([
        ...teamMembers,
        {
          id: Date.now().toString(),
          name: inviteEmail.split("@")[0],
          email: inviteEmail,
          role: inviteRole,
          status: "Pending",
          avatar: "#EBFD84",
        },
      ]);
      setInviteEmail("");
      setInviteRole("Editor");
      setShowInviteModal(false);
    }
  };

  const handleRemove = () => {
    if (selectedMember) {
      setTeamMembers(teamMembers.filter((m) => m.id !== selectedMember.id));
      setShowRemoveModal(false);
      setSelectedMember(null);
    }
  };

  const roleDescriptions = [
    {
      role: "Admin",
      color: "bg-brand-lavender/20",
      permissions: ["Full access", "Manage billing", "Add/remove members"],
    },
    {
      role: "Editor",
      color: "bg-button-green/20",
      permissions: ["Create and edit ICPs", "Access collections"],
    },
    {
      role: "Viewer",
      color: "bg-brand-lavender/20",
      permissions: ["Read-only access"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Back Button */}
      <div className="border-b border-warm-grey bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Account
          </Link>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-['Fraunces'] text-4xl sm:text-5xl mb-3">Team Settings</h1>
          <p className="font-['Plus_Jakarta_Sans'] text-lg text-foreground/70">
            Manage your team members, roles, and seats.
          </p>
        </div>

        {/* Plan Overview Card */}
        <div className="bg-button-green/20 rounded-design border border-black p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-['Fraunces'] text-2xl">Team Plan</h2>
                <span className="font-['Plus_Jakarta_Sans'] text-sm bg-background px-3 py-1 rounded-full border border-black">
                  Active
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
                <span className="font-bold text-foreground">
                  {seatsUsed} of {totalSeats} seats used
                </span>
                {!hasAvailableSeats && " • No seats available"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/account">
                <Button
                  variant="outline"
                  className="bg-transparent font-['Fraunces'] hover:bg-accent-grey/20"
                >
                  Manage Billing
                </Button>
              </Link>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-button-green text-text-dark hover:bg-button-green/90 font-['Fraunces'] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Team Member
              </Button>
            </div>
          </div>
        </div>

        {/* Role Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {roleDescriptions.map((item, index) => (
            <div
              key={index}
              className={`${item.color} rounded-design border border-black p-5`}
            >
              <h3 className="font-['Fraunces'] text-lg mb-3">{item.role}</h3>
              <ul className="space-y-2">
                {item.permissions.map((permission, idx) => (
                  <li key={idx} className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-button-green mt-0.5">•</span>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Team Members List */}
        <div className="bg-background rounded-design border border-black overflow-hidden">
          <div className="border-b border-warm-grey p-4 bg-accent-grey/30">
            <h2 className="font-['Fraunces'] text-xl">Team Members</h2>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="border-b border-warm-grey">
                <tr>
                  <th className="text-left p-4 font-['Plus_Jakarta_Sans'] text-sm">Member</th>
                  <th className="text-left p-4 font-['Plus_Jakarta_Sans'] text-sm">Email</th>
                  <th className="text-left p-4 font-['Plus_Jakarta_Sans'] text-sm">Role</th>
                  <th className="text-left p-4 font-['Plus_Jakarta_Sans'] text-sm">Status</th>
                  <th className="text-right p-4 font-['Plus_Jakarta_Sans'] text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`border-b border-warm-grey last:border-b-0 ${
                      index % 2 === 0 ? "bg-background" : "bg-accent-grey/10"
                    } hover:bg-accent-grey/20 transition-colors`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full border border-black flex items-center justify-center text-sm font-['Fraunces']"
                          style={{ backgroundColor: member.avatar }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
                      {member.email}
                    </td>
                    <td className="p-4">
                      <span className="font-['Plus_Jakarta_Sans'] text-xs bg-background px-3 py-1 rounded-full border border-black inline-block">
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-['Plus_Jakarta_Sans'] text-xs px-3 py-1 rounded-full border border-black inline-flex items-center gap-1 ${
                          member.status === "Active"
                            ? "bg-button-green/20"
                            : "bg-brand-lime/20"
                        }`}
                      >
                        {member.status === "Active" ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        {member.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-accent-grey rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="font-['Plus_Jakarta_Sans'] text-sm">
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-['Plus_Jakarta_Sans'] text-sm">
                            Resend Invite
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="font-['Plus_Jakarta_Sans'] text-sm text-red-600"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowRemoveModal(true);
                            }}
                          >
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-warm-grey">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className={`p-4 ${
                  index % 2 === 0 ? "bg-background" : "bg-accent-grey/10"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full border border-black flex items-center justify-center font-['Fraunces']"
                    style={{ backgroundColor: member.avatar }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-['Plus_Jakarta_Sans'] font-medium mb-1">{member.name}</h3>
                    <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-2">
                      {member.email}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="font-['Plus_Jakarta_Sans'] text-xs bg-background px-3 py-1 rounded-full border border-black">
                        {member.role}
                      </span>
                      <span
                        className={`font-['Plus_Jakarta_Sans'] text-xs px-3 py-1 rounded-full border border-black inline-flex items-center gap-1 ${
                          member.status === "Active"
                            ? "bg-button-green/20"
                            : "bg-brand-lime/20"
                        }`}
                      >
                        {member.status === "Active" ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        {member.status}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-accent-grey rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="font-['Plus_Jakarta_Sans'] text-sm">
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-['Plus_Jakarta_Sans'] text-sm">
                        Resend Invite
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-['Plus_Jakarta_Sans'] text-sm text-red-600"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowRemoveModal(true);
                        }}
                      >
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Team Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Fraunces'] text-2xl">
              Invite Team Member
            </DialogTitle>
            <DialogDescription className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
              {hasAvailableSeats
                ? "Send an invitation to join your team workspace."
                : "You've reached your seat limit. Add more seats to invite new team members."}
            </DialogDescription>
          </DialogHeader>

          {hasAvailableSeats ? (
            <div className="space-y-4 mt-4">
              <div>
                <label className="font-['Plus_Jakarta_Sans'] text-sm font-medium mb-2 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="font-['Plus_Jakarta_Sans'] border-black rounded-design"
                />
              </div>

              <div>
                <label className="font-['Plus_Jakarta_Sans'] text-sm font-medium mb-2 block">
                  Role
                </label>
                <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                  <SelectTrigger className="font-['Plus_Jakarta_Sans'] border-black rounded-design">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin" className="font-['Plus_Jakarta_Sans']">Admin</SelectItem>
                    <SelectItem value="Editor" className="font-['Plus_Jakarta_Sans']">Editor</SelectItem>
                    <SelectItem value="Viewer" className="font-['Plus_Jakarta_Sans']">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowInviteModal(false)}
                  variant="outline"
                  className="flex-1 font-['Fraunces'] bg-transparent hover:bg-accent-grey/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail}
                  className="flex-1 bg-button-green text-text-dark hover:bg-button-green/90 font-['Fraunces']"
                >
                  Send Invite
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="bg-brand-lime/20 rounded-design border border-black p-4">
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
                  You're using all {totalSeats} seats. Upgrade to add more team members.
                </p>
              </div>
              <Button
                onClick={() => setShowInviteModal(false)}
                className="w-full bg-button-green text-text-dark hover:bg-button-green/90 font-['Fraunces']"
              >
                Add Seat (£20/mo)
              </Button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Member Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Fraunces'] text-2xl">
              Remove team member?
            </DialogTitle>
            <DialogDescription className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
              {selectedMember?.name} will lose access immediately and won't be able to view or
              edit any ICPs or collections.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => setShowRemoveModal(false)}
              variant="outline"
              className="flex-1 font-['Fraunces'] bg-transparent hover:bg-accent-grey/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              className="flex-1 bg-brand-coral text-text-dark hover:bg-brand-coral/90 font-['Fraunces'] border border-black"
            >
              Remove Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

