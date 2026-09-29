# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class StudionetRuntimeProbe(gl.Contract):
	probe_value: str

	def __init__(self):
		self.probe_value = 'FAIRMOD_RUNTIME_OK'

	@gl.public.view
	def get_probe(self) -> str:
		return self.probe_value
