import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company?: string
  tier: string
  email: string
}

interface NetworkNode {
  id: string
  name: string
  company?: string
  tier: string
  email: string
  group: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  strength: number
}

interface NetworkVisualizationProps {
  contacts: Contact[]
  width?: number
  height?: number
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  contacts,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null)

  useEffect(() => {
    if (!contacts.length || !svgRef.current) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    // Create nodes from contacts
    const nodes: NetworkNode[] = contacts.map((contact, index) => ({
      id: contact.id || `contact-${index}`,
      name: `${contact.firstName} ${contact.lastName}`,
      company: contact.company,
      tier: contact.tier,
      email: contact.email,
      group: contact.tier === 'TIER_1' ? 1 : contact.tier === 'TIER_2' ? 2 : 3
    }))

    // Create links between contacts (simplified - in reality this would be based on actual relationships)
    const links: NetworkLink[] = []
    
    // Create connections between contacts from same company
    const companiesMap = new Map<string, NetworkNode[]>()
    nodes.forEach(node => {
      if (node.company) {
        if (!companiesMap.has(node.company)) {
          companiesMap.set(node.company, [])
        }
        companiesMap.get(node.company)!.push(node)
      }
    })

    // Link contacts from same companies
    companiesMap.forEach(companyNodes => {
      if (companyNodes.length > 1) {
        for (let i = 0; i < companyNodes.length - 1; i++) {
          for (let j = i + 1; j < companyNodes.length; j++) {
            links.push({
              source: companyNodes[i].id,
              target: companyNodes[j].id,
              strength: 0.8
            })
          }
        }
      }
    })

    // Create some random connections between high-tier contacts
    const tier1Nodes = nodes.filter(n => n.group === 1)
    const tier2Nodes = nodes.filter(n => n.group === 2)
    
    // Connect some Tier 1 contacts to each other
    for (let i = 0; i < Math.min(tier1Nodes.length - 1, 3); i++) {
      for (let j = i + 1; j < Math.min(tier1Nodes.length, 4); j++) {
        if (Math.random() > 0.7) {
          links.push({
            source: tier1Nodes[i].id,
            target: tier1Nodes[j].id,
            strength: 0.9
          })
        }
      }
    }

    // Connect some Tier 1 to Tier 2
    tier1Nodes.forEach(t1Node => {
      tier2Nodes.slice(0, 2).forEach(t2Node => {
        if (Math.random() > 0.6) {
          links.push({
            source: t1Node.id,
            target: t2Node.id,
            strength: 0.6
          })
        }
      })
    })

    // Set up D3 simulation
    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkLink>(links).id(d => d.id).strength(d => d.strength))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    // Create gradient definitions for node colors
    const defs = svg.append('defs')
    
    const gradientTier1 = defs.append('radialGradient')
      .attr('id', 'gradient-tier1')
    gradientTier1.append('stop').attr('offset', '0%').attr('stop-color', '#10b981')
    gradientTier1.append('stop').attr('offset', '100%').attr('stop-color', '#059669')

    const gradientTier2 = defs.append('radialGradient')
      .attr('id', 'gradient-tier2')
    gradientTier2.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b')
    gradientTier2.append('stop').attr('offset', '100%').attr('stop-color', '#d97706')

    const gradientTier3 = defs.append('radialGradient')
      .attr('id', 'gradient-tier3')
    gradientTier3.append('stop').attr('offset', '0%').attr('stop-color', '#6b7280')
    gradientTier3.append('stop').attr('offset', '100%').attr('stop-color', '#4b5563')

    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', d => Math.sqrt(d.strength * 3))

    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')

    const circles = node.append('circle')
      .attr('r', d => d.group === 1 ? 12 : d.group === 2 ? 10 : 8)
      .attr('fill', d => 
        d.group === 1 ? 'url(#gradient-tier1)' :
        d.group === 2 ? 'url(#gradient-tier2)' :
        'url(#gradient-tier3)'
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')

    // Add labels
    const labels = node.append('text')
      .text(d => d.name.split(' ').map(name => name[0]).join(''))
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .style('pointer-events', 'none')

    // Add hover effects
    circles
      .on('mouseover', (event, d) => {
        setHoveredNode(d)
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr('r', (d: NetworkNode) => (d.group === 1 ? 15 : d.group === 2 ? 13 : 11))
      })
      .on('mouseout', (event, d) => {
        setHoveredNode(null)
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr('r', (d: NetworkNode) => (d.group === 1 ? 12 : d.group === 2 ? 10 : 8))
      })
      .on('click', (event, d) => {
        setSelectedNode(d)
      })

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, NetworkNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    circles.call(drag)

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [contacts, width, height])

  return (
    <div className="relative">
      <svg ref={svgRef} className="border border-gray-200 rounded-lg bg-white"></svg>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
        <h4 className="font-semibold text-sm mb-2">Contact Tiers</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 mr-2"></div>
            <span>Tier 1 - High Priority</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 mr-2"></div>
            <span>Tier 2 - Medium Priority</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 mr-2"></div>
            <span>Tier 3 - General Network</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm max-w-xs z-10">
          <div className="font-semibold">{hoveredNode.name}</div>
          {hoveredNode.company && <div className="text-gray-300">{hoveredNode.company}</div>}
          <div className="text-blue-300">{hoveredNode.email}</div>
          <div className="text-xs text-gray-400 mt-1">
            {hoveredNode.tier === 'TIER_1' ? '⭐ Tier 1' : 
             hoveredNode.tier === 'TIER_2' ? '🔸 Tier 2' : '◯ Tier 3'}
          </div>
        </div>
      )}

      {/* Selected node details */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Contact Details</h4>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <div><strong>Name:</strong> {selectedNode.name}</div>
            {selectedNode.company && <div><strong>Company:</strong> {selectedNode.company}</div>}
            <div><strong>Email:</strong> {selectedNode.email}</div>
            <div><strong>Tier:</strong> {
              selectedNode.tier === 'TIER_1' ? '⭐ Tier 1 - High Priority' : 
              selectedNode.tier === 'TIER_2' ? '🔸 Tier 2 - Medium Priority' : 
              '◯ Tier 3 - General Network'
            }</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NetworkVisualization