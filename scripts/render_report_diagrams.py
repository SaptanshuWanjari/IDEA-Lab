import subprocess
import os
import json
import shutil

DIAGRAMS = {
    "fig_overall_arch.mmd": """flowchart LR
    subgraph Ingestion["1. Quarantined Custody & Ingestion"]
        PDF["RBI Circular (PDF)"] --> MIN["MinIO Storage<br/>document_artifacts"]
        MIN --> WRK["Dramatiq Async Worker<br/>pdfplumber & Regex Parsing"]
    end

    subgraph Knowledge["2. Hybrid Retrieval & Knowledge"]
        WRK --> QD[("Qdrant Vector DB<br/>Dense Cosine 1024-dim")]
        WRK --> TAN[("Tantivy BM25<br/>Inverted Index")]
        WRK --> NEO[("Neo4j Graph<br/>Lineage & Amendments")]
        QD & TAN & NEO --> RRF["RRF Fusion + MiniMax-M3 Cross-Encoder Reranker"]
    end

    subgraph Agent["3. 4-Node LangGraph Engine"]
        RRF --> LG["Understanding -> Requirements -> MAP Gen -> Dependency DAG"]
    end

    subgraph Governance["4. HITL Governance & Digital Twin"]
        LG --> DIFF["Plan Diff Review<br/>(GET /maps/plans/id/diff)"]
        DIFF --> TWIN["Monte Carlo Digital Twin<br/>Calibration Gate & Bottleneck Sim"]
        DIFF --> EXEC["Controlled Transitions &<br/>Content Evidence (Assess -> Approve)"]
        EXEC --> SNAP["Content-Hashed Snapshot<br/>PostgreSQL Audit Ledger"]
    end
""",

    "fig_deployment_topology.mmd": """flowchart LR
    subgraph Host["Host Workstation"]
        OLL["Ollama Runtime (:11434)<br/>minimax-m3:cloud / llama3.2<br/>qwen3-embedding:0.6b"]
        APP["Desktop App (Electron 33)<br/>React 19 + Vite 8 + TailwindCSS 4<br/>Native IPC Dialog & Canvas DAG"]
    end

    subgraph Compose["Docker Containerized Infrastructure"]
        API["FastAPI Backend (:8000)<br/>Async ASGI REST & Auth Endpoints"]
        WRK["Dramatiq Async Worker<br/>Job Processing & Ingestion Queue"]
        REDIS[("Redis (:6379)<br/>Broker & Task Queue")]
        PG[("PostgreSQL 16 (:5432)<br/>Relational & Audit Ledger")]
        QD[("Qdrant (:6333)<br/>Dense Vector Engine")]
        NEO[("Neo4j 5.18 (:7474/7687)<br/>Cypher Knowledge Graph")]
        MIN[("MinIO S3 (:9000/9001)<br/>Quarantined Doc Custody")]
        TAN[("Tantivy BM25 Index<br/>Embedded Rust Volume")]
    end

    APP -->|"REST API / HttpOnly Cookies"| API
    API -->|"Async Jobs"| REDIS
    REDIS --> WRK
    API -->|"LLM & Embeddings"| OLL
    WRK -->|"LLM & Embeddings"| OLL
    API --> PG
    WRK --> PG
    WRK --> QD
    WRK --> NEO
    WRK --> MIN
    WRK --> TAN
    API --> QD
    API --> NEO
    API --> MIN
    API --> TAN
""",

    "fig_langgraph_pipeline.mmd": """flowchart LR
    ENTRY["Node 1: Understanding<br/>Summary & Reg Domains"] --> REQ["Node 2: Requirements<br/>Clause Extraction + Hybrid Retrieval & Graph Context"]
    REQ --> MAPS["Node 3: MAP Generation<br/>Department Ownership, Deadlines, Evidentiary Standard, Source Citations"]
    MAPS --> DEPS["Node 4: Dependency Inference<br/>Topological Precedence & Cycle-Free DAG"]
    DEPS --> END["Persist Candidate Plan<br/>Versioned Plan Diff (GET /maps/plans/{id}/diff)"]
""",

    "fig_hitl_review.mmd": """flowchart LR
    subgraph Review["Phase 1: Plan Diff Review"]
        DRAFT["Draft Candidate Plan"] --> DIFF["Side-by-Side Plan Diff"]
        DIFF -->|"Approve"| APP["Approved Plan"]
        DIFF -->|"Edit / Reject"| ADJ["Manual Edit / Archive"]
    end

    subgraph Execution["Phase 2: Controlled Execution"]
        APP --> PEND["Pending Tasks"]
        PEND -->|"POST /transition"| INPROG["In Progress"]
        INPROG --> EVDRAFT["Upload Documentary Evidence"]
    end

    subgraph Evidence["Phase 3: Content-Level Evidence Verification"]
        EVDRAFT --> ASSESS["POST /evidence/assess<br/>LLM Semantic Verification"]
        ASSESS --> DECIDE{"Officer Sign-Off"}
        DECIDE -->|"Approve"| COMPL["Task Completed"]
        DECIDE -->|"Reject"| REWORK["Rework Required"]
    end

    subgraph Snapshot["Phase 4: Cryptographic Ledger"]
        COMPL --> SNAP["POST /maps/snapshots<br/>Content-Hashed Snapshot"]
        SNAP --> REP["GET /regulations/id/report<br/>Audit-Ready Report"]
    end
""",

    "fig_digital_twin.mmd": """flowchart LR
    DAG["Topological DAG<br/>Kahn's Sort & Critical Path"] --> GATE{"Calibration Gate<br/>>= 30 actuals & MAPE <= 0.25"}
    GATE -->|"Pass"| CAL["Calibrated Scenario"]
    GATE -->|"Fail"| UNCAL["Uncalibrated Estimate<br/>(Badge + Quality Notes)"]
    CAL & UNCAL --> MC["Monte Carlo Simulator (N=100)<br/>Triangular: (opt, likely, pess)"]
    MC --> SCHED["Greedy DAG Scheduler"]
    SCHED --> METRICS["Empirical Aggregation<br/>Median (P50) & P90 Makespans<br/>Department Bottleneck Frequency"]
    METRICS --> OUT["Scenario Output + Seed=17<br/>Input Snapshot ID"]
""",

    "fig_dependency_dag.mmd": """graph LR
    M1["MAP-1: Policy Framework Update<br/>Compliance · 5 Days"] --> M2["MAP-2: Enterprise Software Patch<br/>IT & Infrastructure · 7 Days"]
    M1 --> M3["MAP-3: Risk Assessment Approval<br/>Risk Management · 3 Days"]
    M2 --> M4["MAP-4: Operational Training & SOPs<br/>Operations · 4 Days"]
    M3 --> M4
    M4 --> M5["MAP-5: Branch Network Rollout<br/>Operations · 6 Days"]
    M5 --> M6["MAP-6: Independent Verification Audit<br/>Internal Audit · 2 Days"]

    style M1 fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style M2 fill:#fee2e2,stroke:#ef4444,stroke-width:3px
    style M4 fill:#fee2e2,stroke:#ef4444,stroke-width:3px
    style M5 fill:#fee2e2,stroke:#ef4444,stroke-width:3px
    style M6 fill:#fee2e2,stroke:#ef4444,stroke-width:3px
    linkStyle 0,2,4,5 stroke:#ef4444,stroke-width:3px
"""
}

base_dir = "/home/saptanshu/MyFiles/Projects/IDEA-Lab/docs/report/diagram_src"
os.makedirs(base_dir, exist_ok=True)

# Write puppeteer config
pptr_cfg_path = os.path.join(base_dir, "puppeteer-config.json")
with open(pptr_cfg_path, "w") as f:
    json.dump({
        "executablePath": "/usr/bin/google-chrome-stable",
        "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
    }, f, indent=2)

# Write mermaid config with larger font size for high readability
mmd_cfg_path = os.path.join(base_dir, "mermaid-config.json")
with open(mmd_cfg_path, "w") as f:
    json.dump({
        "theme": "default",
        "themeVariables": {
            "fontSize": "18px",
            "fontFamily": "arial"
        }
    }, f, indent=2)

for name, content in DIAGRAMS.items():
    mmd_path = os.path.join(base_dir, name)
    with open(mmd_path, "w") as f:
        f.write(content)
    png_name = name.replace(".mmd", ".png")
    out_png = os.path.join("/home/saptanshu/MyFiles/Projects/IDEA-Lab/docs/report", png_name)
    print(f"Rendering {name} -> {png_name}...")
    cmd = [
        "npx", "-y", "@mermaid-js/mermaid-cli",
        "-i", mmd_path,
        "-o", out_png,
        "-p", pptr_cfg_path,
        "-c", mmd_cfg_path,
        "-b", "white",
        "-s", "4"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error rendering {name}: {res.stderr}")
    else:
        print(f"Success: {out_png}")

# Also copy fig_overall_arch.png as methodology.png
shutil.copyfile(
    "/home/saptanshu/MyFiles/Projects/IDEA-Lab/docs/report/fig_overall_arch.png",
    "/home/saptanshu/MyFiles/Projects/IDEA-Lab/docs/report/methodology.png"
)
print("Updated methodology.png from fig_overall_arch.png")

# Cleanup diagram_src
shutil.rmtree(base_dir, ignore_errors=True)
print("Cleaned up diagram_src directory")

