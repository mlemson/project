import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_TASK_DURATION_MINUTES, buildTaskActions, createDefaultIntegrations, taskDraftFromCapture } from '../../lib/tasks/taskIntelligence'
import type { AppLanguage, CaptureColor, QuickCaptureLink, QuickCaptureNode, TaskItem } from '../../lib/storage/types'

interface QuickCaptureBoardProps {
  language: AppLanguage
  nodes: QuickCaptureNode[]
  links: QuickCaptureLink[]
  onAddNode: () => void
  onUpdateNode: (nodeId: string, patch: Partial<QuickCaptureNode>) => void
  onDeleteNode: (nodeId: string) => void
  onToggleLink: (fromId: string, toId: string) => void
  onConvertToTask: (task: Omit<TaskItem, 'id' | 'completed' | 'createdAt' | 'completionDate' | 'completionHistory'>) => void
}

export function QuickCaptureBoard({
  language,
  nodes,
  links,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onToggleLink,
  onConvertToTask,
}: QuickCaptureBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [resizing, setResizing] = useState<{
    id: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null)
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const captureColors: Array<{ id: CaptureColor; label: string }> = language === 'en'
    ? [
        { id: 'sand', label: 'Sand' },
        { id: 'coral', label: 'Coral' },
        { id: 'sky', label: 'Blue' },
        { id: 'mint', label: 'Mint' },
        { id: 'lavender', label: 'Lavender' },
      ]
    : [
        { id: 'sand', label: 'Zand' },
        { id: 'coral', label: 'Koraal' },
        { id: 'sky', label: 'Blauw' },
        { id: 'mint', label: 'Mint' },
        { id: 'lavender', label: 'Lila' },
      ]

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current) {
      return
    }

    if (resizing) {
      const deltaX = event.clientX - resizing.startX
      const deltaY = event.clientY - resizing.startY
      onUpdateNode(resizing.id, {
        width: Math.max(180, resizing.startWidth + deltaX),
        height: Math.max(120, resizing.startHeight + deltaY),
      })
      return
    }

    if (!dragging) {
      return
    }

    const rect = boardRef.current.getBoundingClientRect()
    const nextX = Math.max(8, Math.min(event.clientX - rect.left - dragging.offsetX, rect.width - 140))
    const nextY = Math.max(8, Math.min(event.clientY - rect.top - dragging.offsetY, rect.height - 110))
    onUpdateNode(dragging.id, { x: nextX, y: nextY })
  }

  const handleMouseUp = () => {
    setDragging(null)
    setResizing(null)
  }

  return (
    <section className="panel card-stack wide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Ideas' : 'Ideeen'}</p>
          <h2>{language === 'en' ? 'Capture, move and connect loose thoughts' : 'Losse gedachten vangen, slepen en koppelen'}</h2>
        </div>
        <button className="primary-button" type="button" onClick={onAddNode}>
          {language === 'en' ? 'New note' : 'Nieuwe gedachte'}
        </button>
      </div>

      <p className="helper-copy">
        {language === 'en'
          ? 'Drag cards around, resize them and connect ideas in a lightweight mind map.'
          : 'Sleep kaarten rond, maak ze groter of kleiner en koppel ideeen aan elkaar als eenvoudige mindmap.'}
        {linkSourceId ? ` ${language === 'en' ? 'Choose a second idea to create the link.' : 'Kies nu een tweede idee om direct een lijn te maken.'}` : ''}
      </p>

      <div
        ref={boardRef}
        className="mindmap-board"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className="mindmap-lines" aria-hidden="true">
          {links.map((link) => {
            const fromNode = nodesById.get(link.fromId)
            const toNode = nodesById.get(link.toId)

            if (!fromNode || !toNode) {
              return null
            }

            return (
              <line
                key={link.id}
                x1={fromNode.x + fromNode.width / 2}
                y1={fromNode.y + fromNode.height / 2}
                x2={toNode.x + toNode.width / 2}
                y2={toNode.y + toNode.height / 2}
              />
            )
          })}
        </svg>

        {nodes.map((node) => (
          <CaptureNodeCard
            key={node.id}
            language={language}
            captureColors={captureColors}
            node={node}
            selected={selectedNodeId === node.id}
            linkMode={linkSourceId !== null && linkSourceId !== node.id}
            onSelect={() => {
              if (linkSourceId && linkSourceId !== node.id) {
                onToggleLink(linkSourceId, node.id)
                setSelectedNodeId(node.id)
                setLinkSourceId(null)
                return
              }

              setSelectedNodeId((current) => (current === node.id ? null : node.id))
            }}
            onStartDrag={(event) => {
              const article = event.currentTarget.closest('article')

              if (!article) {
                return
              }

              const rect = article.getBoundingClientRect()
              setDragging({ id: node.id, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top })
            }}
            onChange={(patch) => onUpdateNode(node.id, patch)}
            onDelete={() => onDeleteNode(node.id)}
            onResizeStart={(event) =>
              setResizing({
                id: node.id,
                startX: event.clientX,
                startY: event.clientY,
                startWidth: node.width,
                startHeight: node.height,
              })
            }
            onToggleLink={() => {
              setSelectedNodeId(node.id)
              setLinkSourceId((current) => (current === node.id ? null : node.id))
            }}
            onConvertToTask={() => {
              const draft = taskDraftFromCapture(node)
              onConvertToTask({
                ...draft,
                durationMinutes: DEFAULT_TASK_DURATION_MINUTES,
                tracked: false,
                integrations: createDefaultIntegrations(),
              })
            }}
          />
        ))}
      </div>
    </section>
  )
}

interface CaptureNodeCardProps {
  language: AppLanguage
  captureColors: Array<{ id: CaptureColor; label: string }>
  node: QuickCaptureNode
  selected: boolean
  linkMode: boolean
  onSelect: () => void
  onStartDrag: (event: React.MouseEvent<HTMLButtonElement>) => void
  onChange: (patch: Partial<QuickCaptureNode>) => void
  onDelete: () => void
  onResizeStart: (event: React.MouseEvent<HTMLButtonElement>) => void
  onToggleLink: () => void
  onConvertToTask: () => void
}

function CaptureNodeCard({
  language,
  captureColors,
  node,
  selected,
  linkMode,
  onSelect,
  onStartDrag,
  onChange,
  onDelete,
  onResizeStart,
  onToggleLink,
  onConvertToTask,
}: CaptureNodeCardProps) {
  const articleRef = useRef<HTMLElement | null>(null)
  const actions = buildTaskActions({
    title: node.title || (language === 'en' ? 'Loose idea' : 'Los idee'),
    category: 'Quick Capture',
    reminderHint: node.content || (language === 'en' ? 'Work this out later.' : 'Werk dit idee later verder uit.'),
  })

  useEffect(() => {
    if (!articleRef.current) {
      return
    }

    articleRef.current.style.left = `${node.x}px`
    articleRef.current.style.top = `${node.y}px`
    articleRef.current.style.width = `${node.width}px`
    articleRef.current.style.minHeight = `${node.height}px`
  }, [node.height, node.width, node.x, node.y])

  return (
    <article
      ref={articleRef}
      className={selected ? `capture-node selected ${node.color}` : `capture-node compact ${node.color}`}
    >
      <div className="capture-bar">
        <button type="button" className="capture-handle capture-icon-handle" onMouseDown={onStartDrag} aria-label={language === 'en' ? 'Drag idea' : 'Versleep idee'}>
          <span className="capture-handle-dot" />
          <span className="capture-handle-dot" />
          <span className="capture-handle-dot" />
          <span className="capture-handle-dot" />
          <span className="capture-handle-dot" />
          <span className="capture-handle-dot" />
        </button>
        <button
          type="button"
          className={linkMode ? 'capture-select-button link-target' : 'capture-select-button'}
          onClick={onSelect}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect()
            }
          }}
        >
          <span className="capture-bar-title">{node.title || (language === 'en' ? 'New note' : 'Nieuwe gedachte')}</span>
        </button>
      </div>

      {selected && (
        <>
          <input
            className="capture-title"
            value={node.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={language === 'en' ? 'Title' : 'Titel'}
          />
          <textarea
            className="capture-text"
            value={node.content}
            onChange={(event) => onChange({ content: event.target.value })}
            placeholder={language === 'en' ? 'Loose idea, task or note' : 'Los idee, taak of gedachte'}
          />
          <div className="capture-color-row">
            {captureColors.map((color) => (
              <button
                key={color.id}
                type="button"
                className={color.id === node.color ? `color-chip ${color.id} active` : `color-chip ${color.id}`}
                onClick={() => onChange({ color: color.id })}
                aria-label={`${language === 'en' ? 'Choose color' : 'Kies kleur'} ${color.label}`}
                title={color.label}
              />
            ))}
          </div>
          <div className="capture-actions">
            <button type="button" className="ghost-button" onClick={onConvertToTask}>{language === 'en' ? 'Convert to task' : 'Naar taak'}</button>
            <button type="button" className="ghost-button" onClick={() => window.open(actions.calendarUrl, '_blank', 'noopener,noreferrer')}>{language === 'en' ? 'Calendar' : 'Agenda'}</button>
            <button type="button" className="ghost-button" onClick={() => { window.location.href = actions.mailUrl }}>Mail</button>
            <button type="button" className={linkMode ? 'ghost-button accent-button' : 'ghost-button'} onClick={onToggleLink}>{linkMode ? (language === 'en' ? 'Ready to link' : 'Klaar voor koppelen') : (language === 'en' ? 'Link' : 'Koppel')}</button>
            <button type="button" className="ghost-button" onClick={onDelete}>{language === 'en' ? 'Delete' : 'Verwijder'}</button>
          </div>
          <button type="button" className="capture-resize-handle" onMouseDown={onResizeStart} aria-label={language === 'en' ? 'Resize card' : 'Resize kaart'} />
        </>
      )}
    </article>
  )
}