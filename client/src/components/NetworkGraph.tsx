import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface NetworkNode {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  email?: string;
  location?: string;
  tier?: string;
  priorityScore?: number;
  opportunityScore?: number;
  strategicValue?: number;
  size: number;
  color: string;
  influenceScore: number;
  totalConnections: number;
  directConnections: number;
  networkReach: number;
  industryDiversity: number;
  geographicSpread: number;
}

export interface NetworkEdge {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  relationshipType: string;
  strength: number;
  confidence: number;
  isMutual: boolean;
  isVerified: boolean;
  source_type: string;
  interactionCount: number;
  sharedConnections: number;
  strokeWidth: number;
  opacity: number;
  color: string;
  style: string;
}

export interface NetworkStats {
  totalNodes: number;
  totalEdges: number;
  averageConnections: number;
  networkDensity: number;
  verifiedRelationships: number;
  mutualRelationships: number;
  tierDistribution: {
    tier1: number;
    tier2: number;
    tier3: number;
    untiered: number;
  };
  topInfluencers: Array<{id: string; name: string; influenceScore: number}>;
  mostConnected: Array<{id: string; name: string; totalConnections: number}>;
}

export interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  selectedNodeId?: string;
  layout?: 'force' | 'hierarchical' | 'circular' | 'grid';
  showLabels?: boolean;
  highlightConnections?: boolean;
  className?: string;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  stats,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  layout = 'force',
  showLabels = true,
  highlightConnections = true,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Create main group for zoom/pan
    const g = svg.append("g").attr("class", "main-group");

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        const transform = event.transform;
        g.attr("transform", transform);
        setZoomTransform(transform);
      });

    svg.call(zoom);

    // Create arrow markers for directed edges
    const defs = svg.append("defs");
    
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Create simulation based on layout
    let simulation: d3.Simulation<NetworkNode, NetworkEdge>;
    
    switch (layout) {
      case 'force':
        simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink<NetworkNode, NetworkEdge>(edges)
            .id(d => d.id)
            .distance(d => {
              const baseDistance = 50;
              const strengthMultiplier = (1 - (d.strength || 0.5)) * 100;
              return baseDistance + strengthMultiplier;
            })
            .strength(d => (d.strength || 0.5) * 0.8)
          )
          .force("charge", d3.forceManyBody()
            .strength(d => {
              const baseCharge = -300;
              const sizeMultiplier = (d.size || 10) / 10;
              return baseCharge * sizeMultiplier;
            })
          )
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide()
            .radius(d => (d.size || 10) + 5)
          );
        break;

      case 'hierarchical':
        // Simple hierarchical layout based on influence score
        simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink<NetworkNode, NetworkEdge>(edges)
            .id(d => d.id)
            .distance(80)
          )
          .force("charge", d3.forceManyBody().strength(-200))
          .force("x", d3.forceX(width / 2).strength(0.1))
          .force("y", d3.forceY(d => {
            const tier = d.tier;
            if (tier === 'TIER_1') return height * 0.2;
            if (tier === 'TIER_2') return height * 0.4;
            if (tier === 'TIER_3') return height * 0.6;
            return height * 0.8;
          }).strength(0.3));
        break;

      case 'circular':
        simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink<NetworkNode, NetworkEdge>(edges)
            .id(d => d.id)
            .distance(60)
          )
          .force("charge", d3.forceManyBody().strength(-150))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("radial", d3.forceRadial(
            Math.min(width, height) / 3,
            width / 2,
            height / 2
          ).strength(0.2));
        break;

      case 'grid':
        // Grid layout with some force simulation for connections
        const gridSize = Math.ceil(Math.sqrt(nodes.length));
        const cellWidth = width / gridSize;
        const cellHeight = height / gridSize;
        
        simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink<NetworkNode, NetworkEdge>(edges)
            .id(d => d.id)
            .distance(40)
            .strength(0.3)
          )
          .force("x", d3.forceX((d, i) => 
            (i % gridSize) * cellWidth + cellWidth / 2
          ).strength(0.5))
          .force("y", d3.forceY((d, i) => 
            Math.floor(i / gridSize) * cellHeight + cellHeight / 2
          ).strength(0.5))
          .force("collision", d3.forceCollide()
            .radius(d => (d.size || 10) + 2)
          );
        break;

      default:
        simulation = d3.forceSimulation(nodes);
    }

    // Create links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke", d => d.color)
      .attr("stroke-width", d => d.strokeWidth)
      .attr("stroke-opacity", d => d.opacity)
      .attr("stroke-dasharray", d => d.style === 'dashed' ? "5,5" : "none")
      .attr("marker-end", d => d.isMutual ? "none" : "url(#arrowhead)");

    // Create link labels for relationship types (shown on hover)
    const linkLabel = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(edges)
      .enter().append("text")
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("opacity", 0)
      .text(d => d.relationshipType.replace('_', ' '));

    // Create nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("class", "node")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", d => selectedNodeId === d.id ? "#000" : "#fff")
      .attr("stroke-width", d => selectedNodeId === d.id ? 3 : 1.5)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d);
      })
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);
        
        if (highlightConnections) {
          // Highlight connected nodes and edges
          const connectedNodeIds = new Set<string>();
          edges.forEach(edge => {
            if (edge.source === d.id || (typeof edge.source === 'object' && edge.source.id === d.id)) {
              connectedNodeIds.add(typeof edge.target === 'string' ? edge.target : edge.target.id);
            }
            if (edge.target === d.id || (typeof edge.target === 'object' && edge.target.id === d.id)) {
              connectedNodeIds.add(typeof edge.source === 'string' ? edge.source : edge.source.id);
            }
          });

          node.attr("opacity", n => n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.2);
          link.attr("opacity", l => {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            return sourceId === d.id || targetId === d.id ? 1 : 0.1;
          });
          
          // Show relationship labels for connected edges
          linkLabel.attr("opacity", l => {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            return sourceId === d.id || targetId === d.id ? 1 : 0;
          });
        }
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        onNodeHover?.(null);
        
        if (highlightConnections) {
          node.attr("opacity", 1);
          link.attr("opacity", d => d.opacity);
          linkLabel.attr("opacity", 0);
        }
      })
      .call(d3.drag<SVGCircleElement, NetworkNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Create node labels
    const label = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("dy", d => d.size + 15)
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("fill", "#333")
      .attr("opacity", showLabels ? 1 : 0)
      .text(d => {
        const name = `${d.firstName} ${d.lastName}`;
        return name.length > 20 ? name.substring(0, 18) + '...' : name;
      })
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as NetworkNode).x!)
        .attr("y1", d => (d.source as NetworkNode).y!)
        .attr("x2", d => (d.target as NetworkNode).x!)
        .attr("y2", d => (d.target as NetworkNode).y!);

      linkLabel
        .attr("x", d => ((d.source as NetworkNode).x! + (d.target as NetworkNode).x!) / 2)
        .attr("y", d => ((d.source as NetworkNode).y! + (d.target as NetworkNode).y!) / 2);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      label
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });

    // Add zoom reset button
    svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", "translate(10, 10)")
      .append("rect")
      .attr("width", 80)
      .attr("height", 30)
      .attr("fill", "#f3f4f6")
      .attr("stroke", "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity
        );
      });

    svg.select(".zoom-controls")
      .append("text")
      .attr("x", 40)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#374151")
      .text("Reset Zoom")
      .style("pointer-events", "none");

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height, layout, selectedNodeId, showLabels, highlightConnections]);

  return (
    <div className={`network-graph-container ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
      >
        {/* Tooltip will be handled by parent component */}
      </svg>
      
      {hoveredNode && (
        <div
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10 pointer-events-none"
          style={{
            left: '50%',
            top: '10px',
            transform: 'translateX(-50%)',
            minWidth: '200px'
          }}
        >
          <div className="font-semibold text-gray-900">{hoveredNode.name}</div>
          {hoveredNode.company && (
            <div className="text-sm text-gray-600">{hoveredNode.position} at {hoveredNode.company}</div>
          )}
          {hoveredNode.location && (
            <div className="text-sm text-gray-500">{hoveredNode.location}</div>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Connections:</span> {hoveredNode.totalConnections}
              </div>
              <div>
                <span className="font-medium">Influence:</span> {Math.round(hoveredNode.influenceScore * 100)}%
              </div>
              {hoveredNode.priorityScore && (
                <div>
                  <span className="font-medium">Priority:</span> {Math.round(hoveredNode.priorityScore)}
                </div>
              )}
              {hoveredNode.opportunityScore && (
                <div>
                  <span className="font-medium">Opportunity:</span> {Math.round(hoveredNode.opportunityScore)}
                </div>
              )}
            </div>
          </div>
          
          {hoveredNode.tier && (
            <div className="mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                hoveredNode.tier === 'TIER_1' ? 'bg-red-100 text-red-800' :
                hoveredNode.tier === 'TIER_2' ? 'bg-orange-100 text-orange-800' :
                hoveredNode.tier === 'TIER_3' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {hoveredNode.tier.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;