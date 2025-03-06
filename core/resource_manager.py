
class ResourceManager:
    def __init__(self):
        self.resources = {}

    def load_resource(self, resource_type, path):
        """Load a resource from disk"""
        # Will implement later
        pass

    def get_resource(self, resource_id):
        """Get a loaded resource"""
        return self.resources.get(resource_id)

    def unload_resource(self, resource_id):
        """Unload a resource to free memory"""
        if resource_id in self.resources:
            del self.resources[resource_id]
