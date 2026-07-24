import re
from typing import List, Dict
from nom.resolution.schema import GraphEntity

class SimpleGraphRAG:
    """
    A lightweight Graph RAG implementation for entity extraction and linking.
    In a production system, this would connect to Neo4j, LightRAG, or a VectorDB.
    """
    def __init__(self):
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
