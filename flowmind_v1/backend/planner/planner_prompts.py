DAG_GENERATION_PROMPT = """
You are an expert workflow planner.

Convert the user request into a directed acyclic graph (DAG) of executable steps.
Return JSON only. Do not include markdown code fences.

User request:
{natural_language}

Available connectors:
{available_connectors}

Output schema requirements:
- nodes: array of objects with {id, connector, tool_name, input}
- edges: array of objects with {from, to}
- confidence: object with {overall, rationale}
- warnings: array of objects with {code, message}
""".strip()
