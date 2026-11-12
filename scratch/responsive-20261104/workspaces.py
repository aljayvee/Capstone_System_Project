from edits import edit,root
edit('src/portals/dispatcher/components/DispatcherRiderMessagesPanel.tsx',[
 ('  Send,','  ArrowLeft,\n  Send,'),
 ('  const [search, setSearch] = useState("");','  const [search, setSearch] = useState("");\n  const [showConversation, setShowConversation] = useState(Boolean(controlledSelectedRiderId));\n  useEffect(() => {\n    if (controlledSelectedRiderId) setShowConversation(true);\n  }, [controlledSelectedRiderId]);'),
 ('const handleSelectRider = (id: string) => {','const handleSelectRider = (id: string, openConversation = true) => {\n    if (openConversation) setShowConversation(true);'),
 ('handleSelectRider(filteredRiders[0].id);','handleSelectRider(filteredRiders[0].id, false);'),
 ('<div className="flex h-full min-h-0 overflow-hidden rounded-plate','<div data-rider-messages className="flex h-full min-h-0 min-w-0 overflow-hidden rounded-plate'),
 ('<div className="flex w-full shrink-0 flex-col border-hairline bg-board-ground sm:w-[320px] sm:border-r lg:w-[360px]">','<div data-rider-list className={cn("min-h-0 min-w-0 w-full shrink-0 flex-col border-hairline bg-board-ground lg:flex lg:w-[320px] lg:border-r xl:w-[360px]", showConversation ? "hidden" : "flex")}>'),
 ('<div className="flex min-w-0 flex-1 flex-col bg-board-plate">','<div data-rider-conversation className={cn("min-h-0 min-w-0 flex-1 flex-col bg-board-plate lg:flex", showConversation ? "flex" : "hidden")}>\n        <button type="button" onClick={() => setShowConversation(false)} className="flex min-h-11 shrink-0 items-center gap-2 border-b border-hairline px-3 text-label text-ink lg:hidden"><ArrowLeft size={18} />Back to conversations</button>'),
 ('flex items-center gap-2">\n                      <h3','flex min-w-0 flex-wrap items-center gap-2">\n                      <h3')])
edit('src/portals/dispatcher/components/RiderFleetRoster.tsx',[
 ('grid h-full min-h-0 gap-3 lg:grid-cols-3','grid min-h-0 min-w-0 gap-3 lg:h-full lg:grid-cols-3'),
 ('relative min-h-[320px] overflow-hidden','relative h-[clamp(14rem,40dvh,24rem)] min-w-0 overflow-hidden'),
 ('lg:col-span-2 lg:min-h-0','lg:col-span-2 lg:h-full lg:min-h-0'),
 ('flex min-h-0 flex-col overflow-hidden rounded-plate','flex min-h-0 min-w-0 flex-col overflow-hidden rounded-plate'),
 ('min-h-0 flex-1 overflow-y-auto p-2.5','min-h-0 flex-1 p-2.5 lg:overflow-y-auto')])
name='src/portals/owner/modules/tracking/RiderTrackingModule.tsx'; s=(root/name).read_text(encoding='utf-8')
start=s.index('      {/* 3. MOBILE VIEW SWITCHER'); start=s.rfind('      {/* ',0,start)
end=s.index('      <div className="owner-tracking-workspace-enter',start)
# Remove the switcher; both map and roster are now accessible in the same content scroll.
edit(name,[
 ('  const [mobileTab, setMobileTab] = useState<"map" | "roster">("map");\n',''),
 (s[start:end],''),
 ('flex flex-col h-full space-y-3','flex min-h-0 min-w-0 flex-col h-full space-y-3'),
 ('owner-tracking-workspace-enter flex-1 min-h-[360px] grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch overflow-hidden','owner-tracking-workspace-enter flex-1 min-h-0 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-start lg:items-stretch overflow-y-auto lg:overflow-hidden'),
 ('className={`lg:col-span-8 h-full min-h-[320px] relative overflow-hidden ${\n            mobileTab === "roster" ? "hidden sm:block" : "block"\n          }`}','className="lg:col-span-8 h-[clamp(14rem,40dvh,24rem)] lg:h-full min-h-0 min-w-0 relative overflow-hidden"'),
 ('className={`lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden ${\n            mobileTab === "map" ? "hidden sm:flex" : "flex"\n          }`}','className="lg:col-span-4 flex min-w-0 flex-col lg:h-full min-h-0 lg:overflow-hidden"'),
 ('                      if (mobileTab === "roster") setMobileTab("map");\n',''),
 ('sm:right-auto bg-board-plate','bg-board-plate'),
 ('w-auto sm:w-full','w-auto'),
 ('flex-1 min-h-0 overflow-y-auto','flex-1 min-h-0 lg:overflow-y-auto')])
edit('src/portals/owner/components/StandingFigures.tsx',[
 ('"grid grid-cols-1 overflow-hidden','"grid grid-cols-2 overflow-hidden'),
 ('px-4 py-3 first:border-t-0','px-3 py-2 sm:px-4 sm:py-3 first:border-t-0'),
 ('className="truncate text-micro uppercase text-board-trim"','className="text-micro uppercase text-board-trim [overflow-wrap:anywhere]"'),
 ('"truncate text-board"','"truncate text-title sm:text-board"')])
edit('src/styles/index.css',[("@import './owner-appearance.css';","@import './owner-appearance.css';\n@import './portal-responsive.css';")])
print('Updated conversation and tracking workspaces')
