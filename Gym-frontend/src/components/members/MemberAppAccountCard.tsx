import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FaEye, FaEyeSlash, FaKey, FaMobileScreen } from 'react-icons/fa6';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { membersService, MemberAppAccount } from '../../utils/supabase/members-service';

interface MemberAppAccountCardProps {
  memberId: string;
  /** The member record's email — a new account uses it (none means no self-service password reset). */
  memberEmail?: string | null;
}

/**
 * A member's GymBios app account (docs/global-accounts-for-gym-created-members-plan.md §1).
 * Staff create one at the desk, or ask to link the member's existing account (the owner
 * accepts in their app). Once linked the account belongs to the member: no password
 * change, reset or block from here. An old gym-only login no longer signs in; creating
 * or linking an account here retires it.
 */
export function MemberAppAccountCard({ memberId, memberEmail }: MemberAppAccountCardProps) {
  const [account, setAccount] = useState<MemberAppAccount | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');

  const load = useCallback(async () => {
    try {
      setAccount(await membersService.getAppAccount(memberId));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const hasEmail = !!memberEmail && !memberEmail.includes('@family.local');

  const subtitle = !account
    ? 'Loading…'
    : account.status === 'LINKED'
    ? "This member's own GymBios account."
    : account.status === 'GYM_LOGIN'
    ? 'Old gym-only login — replace it with a GymBios account.'
    : account.status === 'AWAITING_CONFIRMATION'
    ? 'Waiting for the member to accept in their app.'
    : 'No app account yet. Create one, or link the account they already have.';

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full shrink-0">
            <FaMobileScreen className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">App Account</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {loadFailed && (
          <p className="text-sm text-red-600">
            Couldn't load the app account. <button type="button" className="underline" onClick={load}>Try again</button>
          </p>
        )}

        {account?.status === 'LINKED' && (
          <div className="space-y-2 text-sm">
            {account.username && (
              <div className="flex items-center gap-2">
                <FaKey className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-muted-foreground">Username:</span>
                <span className="font-mono font-medium">{account.username}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Email:</span>
              {account.email ? (
                <>
                  <span className="font-medium">{account.email}</span>
                  {account.email_verified
                    ? <Badge className="bg-green-100 text-green-800">Verified</Badge>
                    : <Badge className="bg-amber-100 text-amber-800">Not verified</Badge>}
                </>
              ) : (
                <span className="text-amber-700">None</span>
              )}
            </div>
            <p className="text-muted-foreground">
              The account belongs to the member, so the gym can't change its password.
              {account.email && account.email_verified
                ? ' If they forget it, they can reset it from the app.'
                : ' Until they confirm an email in the app, a forgotten password needs GymBios support.'}
            </p>
          </div>
        )}

        {account?.status === 'AWAITING_CONFIRMATION' && (
          <div className="space-y-3 text-sm">
            <p>
              Link request sent to <span className="font-mono font-medium">{account.link_requested_account}</span>.
              Nothing is linked until they accept in the GymBios app
              {account.link_request_expires_at
                ? ` (by ${new Date(account.link_request_expires_at).toLocaleDateString()})`
                : ''}.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => membersService.cancelAccountLink(memberId), 'Link request cancelled')}
            >
              Cancel request
            </Button>
          </div>
        )}

        {account?.status === 'GYM_LOGIN' && (
          <p className="text-sm text-amber-700">
            Old gym login <span className="font-mono font-medium">{account.username}</span> no longer signs in.
            Create a GymBios account for the member, or link the one they already use — the old login is retired.
          </p>
        )}

        {(account?.status === 'NONE' || account?.status === 'GYM_LOGIN') && (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'create' ? 'default' : 'outline'}
                onClick={() => setMode('create')}
              >
                Create account
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'link' ? 'default' : 'outline'}
                onClick={() => setMode('link')}
              >
                Link existing account
              </Button>
            </div>

            {mode === 'create' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FaKey className="h-4 w-4 text-indigo-600" />
                      Username
                    </Label>
                    <Input placeholder="e.g. john.doe" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FaKey className="h-4 w-4 text-indigo-600" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        className="pr-10"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <AccountEmailNote hasEmail={hasEmail} email={memberEmail} />
                <Button
                  type="button"
                  disabled={!username || password.length < 6 || busy}
                  onClick={() => run(async () => {
                    await membersService.createAppAccount(memberId, username.trim(), password);
                    setUsername('');
                    setPassword('');
                  }, 'App account created')}
                >
                  Create GymBios account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Member's GymBios username or email</Label>
                  <Input placeholder="e.g. john.doe or john@email.com" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="off" />
                </div>
                <p className="text-sm text-muted-foreground">
                  For a member who already uses the GymBios app. They'll see the request in the app and
                  nothing is linked until they accept.
                </p>
                <Button
                  type="button"
                  disabled={!identifier.trim() || busy}
                  onClick={() => run(async () => {
                    await membersService.requestAccountLink(memberId, identifier.trim());
                    setIdentifier('');
                  }, 'Link request sent')}
                >
                  Send link request
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Which email a desk-created account gets, and what having none means. */
export function AccountEmailNote({ hasEmail, email }: { hasEmail: boolean; email?: string | null }) {
  return hasEmail ? (
    <p className="text-sm text-muted-foreground">
      The account's email will be <span className="font-medium">{email}</span> (from the member record). The member
      confirms it in the app, then can reset a forgotten password themselves.
    </p>
  ) : (
    <p className="text-sm text-amber-700">
      This member has no email, so the account won't have one either. If they forget their password, they'll
      need GymBios support — the gym can't reset it. They can add an email later in the app.
    </p>
  );
}
