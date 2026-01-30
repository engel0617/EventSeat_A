import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Table, TableShape, Seat, Guest } from '../types';

interface SeatingCanvasProps {
  tables: Table[];
  guests: Guest[];
  onTableUpdate: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  selectedGuestId: string | null;
  onTableSelect: (tableId: string) => void;
  activeTableId: string | null;
  onGuestDrop: (guestId: string, tableId: string, seatIndex?: number) => void;
  activeFilterTag: string | null;
  activeFilterCategory: string | null;
  searchTerm: string;
  nameDisplayMode?: 'surname' | 'full'; // Added prop
}

export const SeatingCanvas: React.FC<SeatingCanvasProps> = ({
  tables,
  guests,
  onTableUpdate,
  onSeatClick,
  selectedGuestId,
  onTableSelect,
  activeTableId,
  onGuestDrop,
  activeFilterTag,
  activeFilterCategory,
  searchTerm,
  nameDisplayMode = 'surname', // Default to surname
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  const SEAT_RADIUS = 12;
  const TABLE_COLOR = "#ffffff";
  const TABLE_STROKE = "#cbd5e1";
  const SEAT_COLOR_EMPTY = "#f1f5f9";
  const SEAT_COLOR_OCCUPIED = "#c7d2fe";
  const SEAT_STROKE = "#94a3b8";
  const TEXT_COLOR = "#475569";
  const HIGHLIGHT_COLOR = "#facc15";
  
  // Overlap warning colors
  const OVERLAP_FILL = "#fee2e2"; // Red-100
  const OVERLAP_STROKE = "#ef4444"; // Red-500

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setTransform(event.transform);
      });
    svg.call(zoom);
  }, []);

  useEffect(() => {
    if (!gRef.current) return;
    const container = d3.select(gRef.current);

    // Calculate overlapping tables
    const overlapIds = new Set<string>();
    for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
            const t1 = tables[i];
            const t2 = tables[j];
            const dist = Math.sqrt(Math.pow(t1.x - t2.x, 2) + Math.pow(t1.y - t2.y, 2));
            // Warning threshold for visual overlap
            if (dist < 160) {
                overlapIds.add(t1.id);
                overlapIds.add(t2.id);
            }
        }
    }

    const tableGroups = container
      .selectAll<SVGGElement, Table>(".table-group")
      .data(tables, (d) => d.id);

    const enterGroups = tableGroups.enter()
      .append("g")
      .attr("class", "table-group")
      .attr("cursor", "move")
      .on("click", (e, d) => {
        if (!e.defaultPrevented) onTableSelect(d.id);
      });

    enterGroups.on("dragover", (event) => event.preventDefault())
    .on("drop", function(event, d) {
       event.preventDefault();
       event.stopPropagation();
       const guestId = event.dataTransfer.getData("guestId");
       if (guestId) onGuestDrop(guestId, d.id);
    });

    const allGroups = enterGroups.merge(tableGroups);

    const drag = d3.drag<SVGGElement, Table>()
      .subject(function(d) { return { x: d.x, y: d.y }; })
      .filter((event) => !event.target.closest(".seat-node"))
      .on("start", function(event, d) {
        d3.select(this).attr("cursor", "grabbing").raise();
        onTableSelect(d.id);
      })
      .on("drag", function(event, d) {
        // Apply both translation and rotation during drag to prevent jumping
        d3.select(this).attr("transform", `translate(${event.x}, ${event.y}) rotate(${d.rotation || 0})`);
      })
      .on("end", function(event, d) {
        d3.select(this).attr("cursor", "move");
        onTableUpdate(d.id, event.x, event.y);
      });

    allGroups.call(drag);
    // Apply initial transform with rotation
    allGroups.attr("transform", d => `translate(${d.x}, ${d.y}) rotate(${d.rotation || 0})`);
    allGroups.selectAll("*").remove(); 

    allGroups.each(function(d) {
      const g = d3.select(this);
      const isActive = d.id === activeTableId;
      const isOverlapping = overlapIds.has(d.id);
      
      const fillColor = isOverlapping ? OVERLAP_FILL : TABLE_COLOR;
      const strokeColor = isOverlapping ? OVERLAP_STROKE : (isActive ? "#6366f1" : TABLE_STROKE);
      const strokeWidth = isActive || isOverlapping ? 3 : 2;
      const opacity = isOverlapping ? 0.85 : 0.95; // Transparency for overlaps

      if (d.shape === TableShape.ROUND) {
        const r = d.radius || 60;
        g.append("circle")
          .attr("r", r)
          .attr("fill", fillColor)
          .attr("fill-opacity", opacity)
          .attr("stroke", strokeColor) 
          .attr("stroke-width", strokeWidth)
          .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))");
        
        // Counter-rotate text so it remains horizontal
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.3em")
          .attr("fill", isOverlapping ? "#991b1b" : TEXT_COLOR) // Dark red text if overlapping
          .attr("transform", `rotate(${-1 * (d.rotation || 0)})`) 
          .style("font-size", `${d.fontSize || 14}px`)
          .style("font-weight", "bold")
          .style("pointer-events", "none")
          .text(d.label);

        const seatCount = d.seats.length;
        const seatDist = r + SEAT_RADIUS + 5;
        d.seats.forEach((seat, i) => {
           const angle = (i * 2 * Math.PI) / seatCount - Math.PI / 2;
           renderSeat(g, Math.cos(angle) * seatDist, Math.sin(angle) * seatDist, seat, d.id, i, d.rotation || 0);
        });
      } else {
        const w = d.width || 140;
        const h = d.height || 80;
        g.append("rect")
          .attr("x", -w/2) .attr("y", -h/2) .attr("width", w) .attr("height", h) .attr("rx", 8)
          .attr("fill", fillColor)
          .attr("fill-opacity", opacity)
          .attr("stroke", strokeColor)
          .attr("stroke-width", strokeWidth)
          .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))");

         // Counter-rotate text
         g.append("text")
          .attr("text-anchor", "middle") .attr("dy", "0.3em") .attr("fill", isOverlapping ? "#991b1b" : TEXT_COLOR)
          .attr("transform", `rotate(${-1 * (d.rotation || 0)})`)
          .style("font-size", `${d.fontSize || 14}px`)
          .style("font-weight", "bold") .style("pointer-events", "none")
          .text(d.label);

         const seatCount = d.seats.length;
         const topCount = Math.ceil(seatCount / 2);
         const bottomCount = seatCount - topCount;
         d.seats.forEach((seat, i) => {
             const isTop = i < topCount;
             const step = w / ((isTop ? topCount : bottomCount) + 1);
             const sx = -w/2 + step * ((isTop ? i : i - topCount) + 1);
             const sy = isTop ? (-h/2 - SEAT_RADIUS - 5) : (h/2 + SEAT_RADIUS + 5);
             renderSeat(g, sx, sy, seat, d.id, i, d.rotation || 0);
         });
      }
    });

    function renderSeat(parentG: any, x: number, y: number, seat: Seat, tableId: string, index: number, tableRotation: number) {
         const guest = guests.find(g => g.id === seat.guestId);
         const isSelectedTarget = selectedGuestId !== null;
         let opacity = 1;
         let ringColor = null;

         // Check filters (Tag and Search and Category)
         if (activeFilterTag || searchTerm || activeFilterCategory) {
            let isMatch = false;
            
            if (guest) {
                const matchesTag = !activeFilterTag || guest.tags.includes(activeFilterTag);
                const matchesCategory = !activeFilterCategory || guest.category === activeFilterCategory;
                const term = searchTerm.toLowerCase();
                const matchesSearch = !searchTerm || (
                    guest.name.toLowerCase().includes(term) ||
                    guest.category.toLowerCase().includes(term) ||
                    guest.tags.some(t => t.toLowerCase().includes(term))
                );
                isMatch = matchesTag && matchesSearch && matchesCategory;
            }

            opacity = isMatch ? 1 : 0.3;
            if (isMatch) ringColor = HIGHLIGHT_COLOR;
         }

         const seatG = parentG.append("g")
           .attr("transform", `translate(${x}, ${y})`)
           .attr("class", "seat-node")
           .style("cursor", "pointer")
           .style("opacity", opacity)
           .on("click", (e: any) => { e.stopPropagation(); onSeatClick(tableId, index); })
           .on("dragover", (e: any) => { e.preventDefault(); d3.select(e.currentTarget).select("circle").attr("stroke", "#6366f1").attr("stroke-width", 3); })
           .on("dragleave", (e: any) => {
               d3.select(e.currentTarget).select("circle")
                 .attr("stroke", ringColor ? ringColor : (isSelectedTarget && !guest ? "#6366f1" : SEAT_STROKE))
                 .attr("stroke-width", ringColor ? 3 : 1);
           })
           .on("drop", (e: any) => {
               e.preventDefault(); e.stopPropagation();
               const gid = e.dataTransfer.getData("guestId");
               if(gid) onGuestDrop(gid, tableId, index);
               d3.select(e.currentTarget).select("circle").attr("stroke", SEAT_STROKE);
           });
         
         if (guest) {
             seatG.attr("draggable", "true")
                  .on("dragstart", (e: any) => { e.dataTransfer.setData("guestId", guest.id); e.dataTransfer.effectAllowed = 'move'; });
         }

         seatG.append("circle")
           .attr("r", SEAT_RADIUS)
           .attr("fill", guest ? SEAT_COLOR_OCCUPIED : SEAT_COLOR_EMPTY)
           .attr("stroke", ringColor ? ringColor : (isSelectedTarget && !guest ? "#6366f1" : SEAT_STROKE))
           .attr("stroke-width", ringColor ? 3 : 1);

         if (guest) {
            let textContent = "";
            let fontSize = "10px";

            if (nameDisplayMode === 'surname') {
                textContent = guest.name.charAt(0);
            } else {
                // Heuristic for CJK vs Latin to determine length limit
                if (/[\u4e00-\u9fa5]/.test(guest.name)) {
                   textContent = guest.name.substring(0, 3);
                   fontSize = textContent.length > 1 ? "8px" : "10px";
                } else {
                   textContent = guest.name.substring(0, 6);
                   fontSize = textContent.length > 2 ? "7px" : "8px"; // Smaller font for longer English names
                }
            }

           seatG.append("text")
              .attr("text-anchor", "middle") .attr("dy", "0.35em") .attr("fill", "#4f46e5")
              .attr("transform", `rotate(${-1 * tableRotation})`) // Counter-rotate guest name
              .style("font-size", fontSize) .style("font-weight", "bold") .style("pointer-events", "none")
              .text(textContent);
         }
    }

    tableGroups.exit().remove();

    let conflictG = container.select<SVGGElement>(".conflict-group");
    if(conflictG.empty()) conflictG = container.append("g").attr("class", "conflict-group").attr("pointer-events", "none");
    conflictG.selectAll("*").remove();
    
    // For conflict lines, we need absolute world coordinates.
    // Since tables are now rotated, we must apply rotation math to find seat positions.
    const seatPositions = new Map<string, {x: number, y: number}>();
    
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const rotatePoint = (x: number, y: number, cx: number, cy: number, angleDeg: number) => {
        const rad = toRadians(angleDeg);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = x - cx;
        const dy = y - cy;
        return {
            x: cx + (dx * cos - dy * sin),
            y: cy + (dx * sin + dy * cos)
        };
    };

    tables.forEach(d => {
       const rotation = d.rotation || 0;
       
       if (d.shape === TableShape.ROUND) {
          const r = d.radius || 60;
          const seatDist = r + SEAT_RADIUS + 5;
          d.seats.forEach((seat, i) => {
             const angle = (i * 2 * Math.PI) / d.seats.length - Math.PI / 2;
             // Local position relative to table center (0,0)
             const lx = Math.cos(angle) * seatDist;
             const ly = Math.sin(angle) * seatDist;
             
             // Rotate local position
             const rotated = rotatePoint(lx, ly, 0, 0, rotation);
             
             // Add to table absolute position
             seatPositions.set(seat.id, { x: d.x + rotated.x, y: d.y + rotated.y });
          });
       } else {
         const w = d.width || 140; const h = d.height || 80;
         const topCount = Math.ceil(d.seats.length / 2);
         d.seats.forEach((seat, i) => {
             const isTop = i < topCount;
             const step = w / ((isTop ? topCount : (d.seats.length - topCount)) + 1);
             const lx = -w/2 + step * ((isTop ? i : i - topCount) + 1);
             const ly = isTop ? (-h/2 - SEAT_RADIUS - 5) : (h/2 + SEAT_RADIUS + 5);
             
             const rotated = rotatePoint(lx, ly, 0, 0, rotation);
             seatPositions.set(seat.id, { 
               x: d.x + rotated.x, 
               y: d.y + rotated.y 
             });
         });
       }
    });

    tables.forEach(table => {
        const seated = table.seats.filter(s => s.guestId).map(s => ({ seat: s, guest: guests.find(g => g.id === s.guestId)! }));
        for (let i = 0; i < seated.length; i++) {
            for (let j = i + 1; j < seated.length; j++) {
                const p1 = seated[i]; const p2 = seated[j];
                const conflict = p1.guest.relationships.some(r => r.startsWith("Avoid:") && r.includes(p2.guest.name)) || 
                                 p2.guest.relationships.some(r => r.startsWith("Avoid:") && r.includes(p1.guest.name));
                if (conflict) {
                    const pos1 = seatPositions.get(p1.seat.id); const pos2 = seatPositions.get(p2.seat.id);
                    if (pos1 && pos2) {
                        conflictG.append("path")
                            .attr("d", `M ${pos1.x} ${pos1.y} Q ${(pos1.x+pos2.x)/2} ${(pos1.y+pos2.y)/2 - 20} ${pos2.x} ${pos2.y}`)
                            .attr("stroke", "#ef4444") .attr("stroke-width", 2) .attr("stroke-dasharray", "4,2") .attr("fill", "none");
                    }
                }
            }
        }
    });
  }, [tables, guests, selectedGuestId, activeTableId, onTableUpdate, onSeatClick, onTableSelect, activeFilterTag, activeFilterCategory, searchTerm, nameDisplayMode]);

  return (
    <div className="w-full h-full bg-slate-100 overflow-hidden relative cursor-grab active:cursor-grabbing canvas-container">
        <div className="absolute inset-0 pointer-events-none opacity-10 grid-bg no-print" 
             style={{ 
               backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
               backgroundSize: '20px 20px',
               transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`
             }}>
        </div>
      <svg ref={svgRef} className="w-full h-full"><g ref={gRef} /></svg>
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-500 pointer-events-none no-print">
        <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-400"></span> 空位</div>
        <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-indigo-200 border border-slate-400"></span> 已入座</div>
         <div className="flex items-center gap-2 text-rose-500 font-bold"><span className="w-8 h-0 border-t-2 border-dashed border-rose-500"></span> 衝突警示</div>
      </div>
    </div>
  );
};