"""
Generate a realistic pharmaceutical deviation investigation PDF for testing the RCA module.
Run:  python generate_test_pdf.py
Output: test_deviation_report.pdf  (in the same folder)
"""
import sys
sys.path.insert(0, r"c:\Users\ASUS\Videos\OneDrive\Desktop\Assignment\rca-module\backend\venv\Lib\site-packages")

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "test_deviation_report.pdf")

# ── Colours ───────────────────────────────────────────────────────────────────
BLUE_DARK  = colors.HexColor("#1e3a8a")
BLUE_MID   = colors.HexColor("#2563eb")
BLUE_LIGHT = colors.HexColor("#dbeafe")
GREY_BG    = colors.HexColor("#f8fafc")
GREY_LINE  = colors.HexColor("#e2e8f0")
RED_DARK   = colors.HexColor("#991b1b")
RED_LIGHT  = colors.HexColor("#fee2e2")
ORANGE     = colors.HexColor("#92400e")
ORANGE_BG  = colors.HexColor("#fef3c7")
GREEN_DARK = colors.HexColor("#14532d")
GREEN_BG   = colors.HexColor("#dcfce7")
WHITE      = colors.white
BLACK      = colors.black

# ── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    """Create a ParagraphStyle that extends 'Normal'."""
    return ParagraphStyle(name, parent=base["Normal"], **kw)

sTitle      = S("sTitle",      fontSize=18, textColor=WHITE,     fontName="Helvetica-Bold", spaceAfter=2)
sSubtitle   = S("sSubtitle",   fontSize=9,  textColor=BLUE_LIGHT, fontName="Helvetica",      spaceAfter=0)
sSecHead    = S("sSecHead",    fontSize=10, textColor=WHITE,     fontName="Helvetica-Bold", spaceAfter=0, spaceBefore=0)
sFieldLabel = S("sFieldLabel", fontSize=7,  textColor=colors.HexColor("#64748b"), fontName="Helvetica-Bold", spaceAfter=1)
sFieldVal   = S("sFieldVal",   fontSize=9,  textColor=BLACK,     fontName="Helvetica", spaceAfter=2, leading=13)
sBody       = S("sBody",       fontSize=9,  textColor=BLACK,     fontName="Helvetica", spaceAfter=4, leading=14)
sBullet     = S("sBullet",     fontSize=9,  textColor=BLACK,     fontName="Helvetica", spaceAfter=3, leading=13, leftIndent=12, bulletIndent=0)
sSmall      = S("sSmall",      fontSize=7,  textColor=colors.HexColor("#94a3b8"), fontName="Helvetica-Oblique")
sWarning    = S("sWarning",    fontSize=8,  textColor=RED_DARK,  fontName="Helvetica-Bold")
sNote       = S("sNote",       fontSize=8,  textColor=ORANGE,    fontName="Helvetica-Oblique")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN


# ── Helpers ───────────────────────────────────────────────────────────────────
def section_header(title):
    """Dark-blue full-width header row."""
    t = Table([[Paragraph(title, sSecHead)]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_DARK),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    return t


def field_row(pairs, widths=None):
    """
    pairs: list of (label, value) — rendered as a 2-col table.
    Accepts 1, 2, or 3 pairs per row.
    """
    if widths is None:
        n = len(pairs)
        cell_w = CONTENT_W / n
        widths = [cell_w] * n

    cells = []
    for label, val in pairs:
        cells.append([
            Paragraph(label.upper(), sFieldLabel),
            Paragraph(str(val) if val else "—", sFieldVal),
        ])

    data = [cells[i] for i in range(len(cells))]
    # Transpose: we want label on top, value below, side by side
    # Build inner mini-tables per cell
    inner_tables = []
    for label, val in pairs:
        inner = Table(
            [[Paragraph(label.upper(), sFieldLabel)],
             [Paragraph(str(val) if val else "—", sFieldVal)]],
            colWidths=[widths[pairs.index((label, val))] - 4]
        )
        inner.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        inner_tables.append(inner)

    outer = Table([inner_tables], colWidths=widths)
    outer.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREY_BG),
        ("BOX",           (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    return outer


def badge_table(label, text, bg, fg):
    t = Table([[Paragraph(f"<b>{label}</b>  {text}", S("b", fontSize=8, textColor=fg, fontName="Helvetica"))]],
              colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg),
        ("BOX",           (0, 0), (-1, -1), 0.5, fg),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    return t


def bullet(text):
    return Paragraph(f"• {text}", sBullet)


def hr():
    return HRFlowable(width="100%", thickness=0.5, color=GREY_LINE, spaceAfter=4, spaceBefore=4)


# ── Document build ────────────────────────────────────────────────────────────
def build_pdf(path):
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN,  bottomMargin=MARGIN,
        title="Deviation Investigation Report – DEV-2026-041",
        author="Sunridge API Pvt Ltd – Quality Assurance",
    )

    story = []

    # ── HEADER BANNER ────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("SUNRIDGE API PVT LTD", S("hc", fontSize=8, textColor=BLUE_LIGHT, fontName="Helvetica")),
        Paragraph("DEVIATION INVESTIGATION REPORT", sTitle),
        Paragraph("GMP CONTROLLED DOCUMENT", S("hr", fontSize=7, textColor=BLUE_LIGHT, fontName="Helvetica", alignment=TA_RIGHT)),
    ]]
    hdr = Table(header_data, colWidths=[40*mm, CONTENT_W - 100*mm, 60*mm])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BLUE_DARK),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",         (1, 0), (1, 0), "CENTER"),
        ("ALIGN",         (2, 0), (2, 0), "RIGHT"),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 4*mm))

    # ── CLASSIFICATION BADGE ─────────────────────────────────────────────────
    story.append(badge_table(
        "CLASSIFICATION: MAJOR DEVIATION",
        "  |  Status: Under Investigation  |  Doc No.: SUN-QA-DEV-2026-041  |  Version: 1.0",
        RED_LIGHT, RED_DARK
    ))
    story.append(Spacer(1, 4*mm))

    # ── SECTION 1: IDENTIFICATION ────────────────────────────────────────────
    story.append(section_header("1.  DEVIATION IDENTIFICATION"))
    story.append(Spacer(1, 1*mm))

    col2 = CONTENT_W / 2
    col3a, col3b, col3c = CONTENT_W * 0.30, CONTENT_W * 0.35, CONTENT_W * 0.35

    story.append(field_row(
        [("Deviation Number", "DEV-2026-041"),
         ("Report Date", "29-Oct-2026")],
        [col2, col2]
    ))
    story.append(Spacer(1, 1*mm))
    story.append(field_row(
        [("Title / Brief Description",
          "Drying temperature excursion in Fluid Bed Dryer FBD-02 during final drying of Atorvastatin Calcium API batch AT-26-0412")],
        [CONTENT_W]
    ))
    story.append(Spacer(1, 1*mm))
    story.append(field_row(
        [("Product Name", "Atorvastatin Calcium API"),
         ("Batch Number", "AT-26-0412"),
         ("Batch Size", "150 kg")],
        [col3a, col3b, col3c]
    ))
    story.append(Spacer(1, 1*mm))
    story.append(field_row(
        [("Process Stage", "Final Drying"),
         ("Equipment ID", "FBD-02 (Fluid Bed Dryer)"),
         ("Equipment Capacity", "200 kg")],
        [col3a, col3b, col3c]
    ))
    story.append(Spacer(1, 1*mm))
    story.append(field_row(
        [("Area / Location", "Production Block B – Drying Room 2"),
         ("Department", "API Manufacturing")],
        [col2, col2]
    ))
    story.append(Spacer(1, 1*mm))
    story.append(field_row(
        [("Date of Occurrence", "28-Oct-2026  (~02:15 to 06:40 IST)"),
         ("Date Detected", "28-Oct-2026  (07:00 IST)"),
         ("Detected By", "Ravi Kumar, Production Operator")],
        [col3a, col3b, col3c]
    ))
    story.append(Spacer(1, 4*mm))

    # ── SECTION 2: DESCRIPTION ───────────────────────────────────────────────
    story.append(section_header("2.  DESCRIPTION OF DEVIATION"))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph(
        "During the final drying step of batch AT-26-0412 (Atorvastatin Calcium API), "
        "the inlet air temperature on Fluid Bed Dryer FBD-02 rose to <b>78 °C</b>, "
        "exceeding the validated upper limit of <b>65 °C (60 °C ± 5 °C)</b>. "
        "The temperature excursion lasted approximately <b>4 hours 25 minutes</b> "
        "(02:15 to 06:40 IST) during the night shift on 28-Oct-2026. "
        "No high-temperature alarm was triggered on the control panel during this period. "
        "The excursion was discovered by the incoming morning-shift operator, Ravi Kumar, "
        "when he reviewed the batch trend chart at shift handover at 07:00 IST.",
        sBody
    ))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("<b>Observations at the time of discovery:</b>", sBody))
    for obs in [
        "Temperature sensor TT-204 on FBD-02 was reading normally on the local display at 07:00.",
        "The high-temperature alarm set point on the SCADA panel was found configured at "
        "90 °C instead of the required 65 °C.",
        "The night shift operator, Deepak Singh (employee ID: EMP-1147), had joined the "
        "company three weeks prior and had completed basic GMP induction but had not yet "
        "completed the equipment-specific training SOP-MFG-FBD-011.",
        "The Batch Manufacturing Record (BMR) for the drying step was found filled in "
        "retrospectively at 07:30, after the excursion had been identified.",
        "The FBD-02 preventive maintenance (PM) log was last updated on 12-Sep-2026; "
        "the next scheduled PM was due on 28-Oct-2026 (i.e., the same day as the excursion).",
        "No other batches were running in Drying Room 2 at the time of the excursion.",
    ]:
        story.append(bullet(obs))
    story.append(Spacer(1, 4*mm))

    # ── SECTION 3: IMMEDIATE ACTIONS ─────────────────────────────────────────
    story.append(section_header("3.  IMMEDIATE ACTIONS TAKEN"))
    story.append(Spacer(1, 2*mm))

    actions = [
        ("28-Oct-2026, 07:05",
         "FBD-02 drying operation stopped. Batch AT-26-0412 placed on QA Hold (Hold Tag #QA-H-2026-188)."),
        ("28-Oct-2026, 07:20",
         "Production Head (Mr. A. Desai) and QA Head (Ms. S. Mehta) informed verbally."),
        ("28-Oct-2026, 08:00",
         "Samples drawn from batch AT-26-0412 and dispatched to QC lab for assay, "
         "related substances, loss on drying (LOD), and residual solvent testing."),
        ("28-Oct-2026, 09:00",
         "SCADA alarm set point for FBD-02 inlet temperature corrected to 65 °C and "
         "documented in Equipment Logbook EL-FBD-02-2026."),
        ("28-Oct-2026, 10:30",
         "FBD-02 taken out of service pending investigation and scheduled PM."),
        ("28-Oct-2026, 11:00",
         "Deviation report initiated and assigned to QA Investigator: Ms. Priya Nair (EMP-0892)."),
    ]

    act_data = [[
        Paragraph("<b>Date / Time</b>", S("ah", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
        Paragraph("<b>Action</b>", S("ah2", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
    ]]
    for dt, action in actions:
        act_data.append([
            Paragraph(dt, S("atd", fontSize=8, fontName="Helvetica")),
            Paragraph(action, S("atv", fontSize=8, fontName="Helvetica", leading=12)),
        ])

    act_table = Table(act_data, colWidths=[40*mm, CONTENT_W - 40*mm])
    act_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  BLUE_MID),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("BACKGROUND",    (0, 1), (-1, -1), GREY_BG),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GREY_BG]),
        ("BOX",           (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(act_table)
    story.append(Spacer(1, 4*mm))

    # ── SECTION 4: IMPACT ASSESSMENT ─────────────────────────────────────────
    story.append(section_header("4.  PRELIMINARY IMPACT ASSESSMENT"))
    story.append(Spacer(1, 2*mm))

    story.append(badge_table(
        "PATIENT SAFETY / PRODUCT QUALITY RISK:",
        "  Potential degradation of Atorvastatin Calcium API. Elevated related substances "
        "and residual solvent levels possible due to prolonged high-temperature exposure.",
        ORANGE_BG, ORANGE
    ))
    story.append(Spacer(1, 2*mm))

    for imp in [
        "<b>Batch AT-26-0412:</b> Placed on QA Hold pending QC results. Release suspended. "
        "Batch may require rejection if OOS results are confirmed.",
        "<b>Other batches:</b> All batches dried in FBD-02 during the preceding 30 days "
        "(01-Oct-2026 to 27-Oct-2026) to be reviewed for any anomalies in drying records. "
        "No other batches currently on hold pending this assessment.",
        "<b>Equipment:</b> FBD-02 is out of service. No impact on other production "
        "equipment identified at this time.",
        "<b>Market / Patient:</b> Batch AT-26-0412 has not been released or distributed. "
        "No patient safety impact anticipated at this stage.",
        "<b>Regulatory:</b> If OOS results are confirmed, a Field Safety Notice and "
        "regulatory notification may be required in applicable markets.",
    ]:
        story.append(bullet(imp))
    story.append(Spacer(1, 4*mm))

    # ── SECTION 5: PRELIMINARY ROOT CAUSE HYPOTHESES ─────────────────────────
    story.append(section_header("5.  PRELIMINARY ROOT CAUSE HYPOTHESES"))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph(
        "The following are <i>unconfirmed hypotheses</i> identified during the initial "
        "assessment. A full root cause investigation (5 Whys / Ishikawa analysis) is "
        "to be completed within 15 working days per SOP-QA-DEV-003.",
        sNote
    ))
    story.append(Spacer(1, 2*mm))

    hyp_data = [
        [Paragraph("<b>#</b>", S("hh", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Hypothesis</b>", S("hh2", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Category</b>", S("hh3", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Status</b>", S("hh4", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold"))],
        ["H1",
         "SCADA alarm set point for FBD-02 inlet temperature was incorrectly set to 90 °C "
         "(should be 65 °C) prior to or during the night shift, disabling the automated alarm.",
         "Machine / Method",
         "Unconfirmed – under investigation"],
        ["H2",
         "The night shift operator (EMP-1147) had not completed equipment-specific training "
         "SOP-MFG-FBD-011, and may have inadvertently altered the alarm set point during setup.",
         "Man / Training",
         "Unconfirmed – training records requested"],
        ["H3",
         "The SCADA change-control configuration may not enforce access controls on alarm "
         "set point modification, allowing unauthorised changes without an audit trail.",
         "Machine / System",
         "Unconfirmed – IT audit trail review pending"],
        ["H4",
         "The overdue preventive maintenance (PM due 28-Oct-2026) may have contributed to "
         "a sensor or controller drift causing uncontrolled temperature rise.",
         "Machine / Maintenance",
         "Unconfirmed – PM and calibration records to be reviewed"],
    ]

    hyp_table = Table(
        [[
            Paragraph(str(row[0]) if not isinstance(row[0], Paragraph) else "", S("tc", fontSize=8, fontName="Helvetica-Bold")) if not isinstance(row[0], Paragraph) else row[0],
            Paragraph(str(row[1]) if not isinstance(row[1], Paragraph) else "", S("tv", fontSize=8, fontName="Helvetica", leading=12)) if not isinstance(row[1], Paragraph) else row[1],
            Paragraph(str(row[2]) if not isinstance(row[2], Paragraph) else "", S("tc2", fontSize=8, fontName="Helvetica")) if not isinstance(row[2], Paragraph) else row[2],
            Paragraph(str(row[3]) if not isinstance(row[3], Paragraph) else "", S("tc3", fontSize=7, fontName="Helvetica-Oblique", textColor=colors.HexColor("#6b7280"))) if not isinstance(row[3], Paragraph) else row[3],
        ] for row in hyp_data],
        colWidths=[8*mm, CONTENT_W - 8*mm - 38*mm - 38*mm, 38*mm, 38*mm]
    )
    hyp_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  BLUE_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GREY_BG]),
        ("BOX",           (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("ALIGN",         (0, 0), (0, -1),  "CENTER"),
    ]))
    story.append(hyp_table)
    story.append(Spacer(1, 4*mm))

    # ── SECTION 6: EVIDENCE REQUIRED ─────────────────────────────────────────
    story.append(section_header("6.  EVIDENCE / INFORMATION REQUIRED FOR INVESTIGATION"))
    story.append(Spacer(1, 2*mm))

    ev_data = [
        [Paragraph("<b>Evidence Item</b>", S("eh", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Purpose</b>", S("eh2", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Responsible</b>", S("eh3", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Due Date</b>", S("eh4", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold"))],
    ]
    evidence = [
        ("SCADA audit trail for FBD-02 (Oct 2026)",
         "Identify when alarm set point was changed and by whom",
         "IT / Engineering", "03-Nov-2026"),
        ("BMR for batch AT-26-0412 (full drying section)",
         "Verify completeness and timing of operator entries",
         "QA", "02-Nov-2026"),
        ("Training records for EMP-1147 (Deepak Singh)",
         "Confirm status of SOP-MFG-FBD-011 completion",
         "HR / QA", "02-Nov-2026"),
        ("Calibration record for TT-204 (last 12 months)",
         "Rule out sensor drift as contributor",
         "Engineering / QC", "04-Nov-2026"),
        ("PM record for FBD-02 (SUN-PM-FBD-02-2026-04)",
         "Confirm PM was overdue and assess maintenance history",
         "Engineering", "02-Nov-2026"),
        ("QC results: assay, RS, LOD, residual solvents for AT-26-0412",
         "Determine impact on product quality and release decision",
         "QC", "05-Nov-2026"),
        ("Review of all FBD-02 batches – Oct 2026 (01–27 Oct)",
         "Identify any other batches with temperature anomalies",
         "QA / Production", "06-Nov-2026"),
        ("Similar deviation history (past 3 years, FBD-02 or other FBDs)",
         "Determine if this is a recurring issue",
         "QA", "06-Nov-2026"),
    ]
    for item, purpose, resp, due in evidence:
        ev_data.append([
            Paragraph(item,    S("ev1", fontSize=8, fontName="Helvetica", leading=11)),
            Paragraph(purpose, S("ev2", fontSize=8, fontName="Helvetica", leading=11)),
            Paragraph(resp,    S("ev3", fontSize=8, fontName="Helvetica")),
            Paragraph(due,     S("ev4", fontSize=8, fontName="Helvetica")),
        ])

    ev_table = Table(ev_data, colWidths=[CONTENT_W*0.30, CONTENT_W*0.37, CONTENT_W*0.18, CONTENT_W*0.15])
    ev_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  BLUE_MID),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GREY_BG]),
        ("BOX",           (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(ev_table)
    story.append(Spacer(1, 4*mm))

    # ── SECTION 7: PRELIMINARY CAPA ──────────────────────────────────────────
    story.append(section_header("7.  PRELIMINARY CORRECTIVE AND PREVENTIVE ACTIONS"))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph(
        "<b>Note:</b> The following actions are preliminary. Final CAPA will be "
        "defined after root cause confirmation. All actions to be tracked in the "
        "CAPA register (CAPA-2026-088).",
        sNote
    ))
    story.append(Spacer(1, 2*mm))

    capa_data = [
        [Paragraph("<b>Type</b>", S("ch", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Action</b>", S("ch2", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Owner</b>", S("ch3", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Priority</b>", S("ch4", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Target Date</b>", S("ch5", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold"))],
    ]
    capa_items = [
        ("Corrective",
         "Perform full QC testing of batch AT-26-0412 (assay, RS, LOD, residual solvents). "
         "Reject or release based on results per SOP-QA-QC-012.",
         "QA / QC", "Critical", "05-Nov-2026"),
        ("Corrective",
         "Verify and correct SCADA alarm set points for all FBDs (FBD-01 to FBD-04) "
         "and document in respective equipment logbooks.",
         "Engineering / QA", "High", "03-Nov-2026"),
        ("Corrective",
         "Complete overdue PM on FBD-02 (SUN-PM-FBD-02-2026-04) before equipment is "
         "returned to service.",
         "Engineering", "High", "07-Nov-2026"),
        ("Corrective",
         "Issue training notice: EMP-1147 to complete SOP-MFG-FBD-011 before next "
         "FBD operation. Training effectiveness to be verified by Production Supervisor.",
         "HR / Production", "High", "04-Nov-2026"),
        ("Preventive",
         "Revise SCADA configuration to enforce change control on alarm set point "
         "modifications — require dual authorisation (operator + supervisor) and "
         "generate an automatic audit trail entry.",
         "IT / Engineering", "High", "30-Nov-2026"),
        ("Preventive",
         "Update SOP-MFG-FBD-011 to include a mandatory pre-run SCADA alarm verification "
         "checklist item (confirm inlet temp alarm ≤ 65 °C before starting drying).",
         "QA / Production", "Medium", "30-Nov-2026"),
        ("Preventive",
         "Review PM scheduling system to add automated escalation alert if PM is overdue "
         "by more than 3 days — prevent equipment use until PM is completed.",
         "Engineering / IT", "Medium", "30-Nov-2026"),
        ("Preventive",
         "Conduct a retroactive review of all FBD-02 batch records for Oct 2026 to "
         "identify any unreported temperature anomalies.",
         "QA", "Medium", "06-Nov-2026"),
    ]
    for type_, action, owner, priority, date in capa_items:
        type_color = colors.HexColor("#1e40af") if type_ == "Corrective" else colors.HexColor("#065f46")
        pri_color  = RED_DARK if priority == "Critical" else ORANGE if priority == "High" else GREEN_DARK
        capa_data.append([
            Paragraph(f"<b>{type_}</b>", S("ct", fontSize=7, fontName="Helvetica-Bold", textColor=type_color)),
            Paragraph(action, S("ca", fontSize=8, fontName="Helvetica", leading=11)),
            Paragraph(owner,  S("co", fontSize=8, fontName="Helvetica")),
            Paragraph(f"<b>{priority}</b>", S("cp", fontSize=8, fontName="Helvetica-Bold", textColor=pri_color)),
            Paragraph(date,   S("cd", fontSize=8, fontName="Helvetica")),
        ])

    capa_table = Table(
        capa_data,
        colWidths=[22*mm, CONTENT_W - 22*mm - 30*mm - 18*mm - 22*mm, 30*mm, 18*mm, 22*mm]
    )
    capa_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  BLUE_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GREY_BG]),
        ("BOX",           (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(capa_table)
    story.append(Spacer(1, 4*mm))

    # ── SECTION 8: APPROVALS ─────────────────────────────────────────────────
    story.append(section_header("8.  REVIEW AND APPROVAL"))
    story.append(Spacer(1, 2*mm))

    sig_data = [
        [Paragraph("<b>Role</b>", S("sh", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Name</b>", S("sh2", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Signature</b>", S("sh3", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
         Paragraph("<b>Date</b>", S("sh4", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold"))],
        ["QA Investigator", "Priya Nair (EMP-0892)", "", "29-Oct-2026"],
        ["Production Head", "Arvind Desai (EMP-0245)", "", ""],
        ["QA Head",         "Shruti Mehta (EMP-0101)", "", ""],
        ["Site QA Director","Rajesh Pillai (EMP-0012)", "", ""],
    ]
    sig_table = Table(
        [[
            Paragraph(str(r[0]), S("sr1", fontSize=8, fontName="Helvetica")),
            Paragraph(str(r[1]), S("sr2", fontSize=8, fontName="Helvetica")),
            Paragraph(str(r[2]), S("sr3", fontSize=8, fontName="Helvetica")),
            Paragraph(str(r[3]), S("sr4", fontSize=8, fontName="Helvetica")),
        ] if not isinstance(r[0], Paragraph) else r
        for r in sig_data],
        colWidths=[45*mm, 55*mm, CONTENT_W - 45*mm - 55*mm - 30*mm, 30*mm]
    )
    sig_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  BLUE_MID),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GREY_BG]),
        ("BOX",           (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, GREY_LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 6*mm))

    # ── FOOTER NOTE ──────────────────────────────────────────────────────────
    story.append(hr())
    story.append(Paragraph(
        "CONFIDENTIAL — GMP Controlled Document. This document is the property of Sunridge API Pvt Ltd. "
        "Unauthorised reproduction or disclosure is prohibited. "
        "SOP Reference: SOP-QA-DEV-003 v4.1  |  CAPA Register: CAPA-2026-088  |  Generated: 29-Oct-2026",
        sSmall
    ))

    doc.build(story)
    print(f"✅  PDF created: {path}")


if __name__ == "__main__":
    build_pdf(OUTPUT)
