import { useState } from "react"
import { deleteUser } from "../services/user"

export default function DangerZone({ user, getToken }) {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)

  const expectedValue = user?.email || user?.name

  const handleDelete = async () => {
    if (confirmText !== expectedValue) return

    try {
      setLoading(true)
      const token = await getToken()
      await deleteUser(token)
      // redirect or logout here
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lg:col-span-12 bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden mb-8">

      {/* Header */}
      <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-red-700">Danger Zone</h3>
        <span className="material-symbols-outlined text-red-500">warning</span>
      </div>

      <div className="p-6 space-y-5">

        {/* Rationale */}
        <div>
          <p className="text-sm font-semibold text-slate-900">Delete Account</p>
          <p className="text-xs text-slate-500 mt-1">
            This action is irreversible. All your conversations, leads, agent configurations, and analytics will be permanently deleted.
            Please proceed only if you fully understand the consequences.
          </p>
        </div>

        {/* Confirmation input */}
        <div>
          <label className="text-xs text-slate-600">
            Type <span className="font-semibold text-red-600">{expectedValue}</span> to confirm deletion
          </label>

          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            placeholder="Type to confirm"
          />
        </div>

        {/* Button */}
        <div className="flex justify-end">
          <button
            disabled={confirmText !== expectedValue || loading}
            onClick={handleDelete}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
              ${confirmText === expectedValue
                ? "border border-red-400 text-red-600 hover:bg-red-600 hover:text-white"
                : "border border-slate-200 text-slate-400 cursor-not-allowed"
              }`}
          >
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </div>

      </div>
    </div>
  )
}