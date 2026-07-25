import re
from typing import List, Dict, Any
from nom.resolution.schema import GraphEntity
from nom.resolution.nd30_knowledge_graph import ND30KnowledgeGraph

class SimpleGraphRAG:
    """
    A lightweight Graph RAG implementation for entity extraction and linking
    with Decree 30/2020/NĐ-CP Knowledge Graph support.
    """
    def __init__(self):
        self.nd30_kg = ND30KnowledgeGraph()
        # Mock knowledge graph
        self.knowledge_graph = {
            "nghị định 30": "Nghị định 30/2020/NĐ-CP về công tác văn thư",
            "luật tổ chức chính quyền địa phương": "Luật Tổ chức chính quyền địa phương năm 2015, sửa đổi bổ sung năm 2019",
            "hđnd": "Hội đồng nhân dân",
            "ubnd": "Ủy ban nhân dân",
            "sở tài chính": "Cơ quan chuyên môn thuộc UBND cấp tỉnh, tham mưu quản lý nhà nước về tài chính",
        }

    def extract_entities(self, text: str) -> List[str]:
        """Simple entity extraction using regex/keywords"""
        found_entities = []
        text_lower = text.lower()
        for key in self.knowledge_graph.keys():
            if key in text_lower:
                found_entities.append(key)
        return found_entities

    def retrieve_context(self, entities: List[str]) -> List[GraphEntity]:
        """Link entities to their context in the graph"""
        context = []
        for entity in entities:
            if entity in self.knowledge_graph:
                context.append(GraphEntity(
                    entity=entity.upper(),
                    entity_type="LAW/ORGANIZATION",
                    context=self.knowledge_graph[entity]
                ))
        return context

    def process(self, text: str) -> List[GraphEntity]:
        """Run the full Graph RAG pipeline for the given text"""
        entities = self.extract_entities(text)
        return self.retrieve_context(entities)

    def extract_nd30_conditions(self, text: str) -> Dict[str, Any]:
        """Extract mandatory legal conditions from Decree 30 Knowledge Graph."""
        return self.nd30_kg.generate_context_rag_prompt(text)

